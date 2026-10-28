defmodule DragnCardsGame.EvaluateTest do
  use ExUnit.Case, async: true
  use DragnCardsWeb.ConnCase
  alias DragnCards.{Plugins, Plugins.Plugin, Repo}
  alias DragnCards.Users.User
  import Ecto.Query
  alias Jason

  alias DragnCardsGame.{GameUI, Game, Evaluate, AutomationRules, RuleMap}

  import ExUnit.Callbacks

  setup do

    game =
      %{
        "cardById" => %{
          "123qwe" =>
            %{
              "inPlay" => false,
              "rotation" => 90
            },
          "456rty" =>
            %{"inPlay" => true}
        },
        "variables" => %{"$THIS_ID" => "123qwe"},
        "functions" => %{},
        "numPlayers" => 3,
        "firstPlayer" => "player1"
      }

    {:ok, %{game: game}}
  end

  test "Check basics", %{game: game} do
    assert Evaluate.evaluate(game, ["EQUAL", "$GAME.cardById.123qwe.rotation", 90])
    assert Evaluate.evaluate(game, ["NOT_EQUAL", "$GAME.cardById.123qwe.rotation", 0])
    assert Evaluate.evaluate(game, ["NEXT_PLAYER", "player2"]) == "player3"
    assert Evaluate.evaluate(game, ["NEXT_PLAYER", "player3"]) == "player1"
    assert Evaluate.evaluate(game, ["GET_INDEX", ["LIST", "a", "b", "c"], "b"]) == 1
    assert Evaluate.evaluate(game, ["GET_INDEX", ["LIST", "a", "k", "c"], "b"]) == nil
    assert Evaluate.evaluate(game, ["AT_INDEX", ["LIST", "a", "b", "c"], 1]) == "b"
    assert Evaluate.evaluate(game, ["AT_INDEX", ["LIST", "a", "b", "c"], 3]) == nil
    assert Evaluate.evaluate(game, ["LENGTH", ["LIST", "a", "b", "c"]]) == 3
    assert Evaluate.evaluate(game, ["AND", ["EQUAL", ["ADD", 1, 2], ["SUBTRACT", 6, 3]], ["EQUAL", ["MULTIPLY", 1, 2], ["DIVIDE", 6, 3]]]) == true
    assert Evaluate.evaluate(game, ["AND", ["EQUAL", ["ADD", 1, 2], ["SUBTRACT", 6, 3]], ["EQUAL", ["MULTIPLY", 1, 2], ["DIVIDE", 6, 2]]]) == false
    assert Evaluate.evaluate(game, ["OR", ["EQUAL", ["ADD", 1, 2], ["SUBTRACT", 6, 3]], ["EQUAL", ["MULTIPLY", 1, 2], ["DIVIDE", 6, 2]]]) == true
    assert Evaluate.evaluate(game, ["JOIN_STRING", "123", "qwe"]) == "123qwe"
    assert Evaluate.evaluate(game, ["IN_STRING", "123qwe", "123"]) == true
    assert Evaluate.evaluate(game, ["IN_STRING", "124qwe", "123"]) == false
    assert Evaluate.evaluate(game, ["OBJ_GET_VAL", %{"a" => 3}, "a"]) == 3
    assert Evaluate.evaluate(game, ["OBJ_GET_VAL", %{"a" => 3}, "b"]) == nil

  end

  test "Check SET", %{game: game} do
    game = Evaluate.evaluate(game, ["SET", "/cardById/123qwe/inPlay", true])
    assert game["cardById"]["123qwe"]["inPlay"] == true

    game = Evaluate.evaluate(game, ["DEFINE", "$MY_PATH", ["LIST", "cardById", "123qwe"]])
    game = Evaluate.evaluate(game, ["SET", "/$MY_PATH/inPlay", false])
    assert game["cardById"]["123qwe"]["inPlay"] == false
  end

  test "Check variables", %{game: game} do
    assert Evaluate.evaluate(game, "*") == "*"
    assert Evaluate.evaluate(game, "$GAME.cardById.123qwe.inPlay") == false
    assert Evaluate.evaluate(game, "$GAME.cardById.456rty.inPlay") == true
  end

  # These used to test Evaluate.path_matches_listenpath?/3 and
  # Evaluate.apply_automation_rule(s), which were replaced by RuleMap and
  # AutomationRules; the same behavior is checked through those here.
  defp rule_game(game, rules) do
    game
    |> Map.merge(%{"roomSlug" => "r", "pluginId" => 1, "groupById" => %{}, "playerData" => %{},
                   "ruleById" => %{}, "ruleMap" => %{}, "automationEnabled" => true, "messages" => []})
    |> AutomationRules.implement_game_rules(rules)
  end

  test "Check listen paths", %{game: game} do
    game = rule_game(game, %{
      "wild" => %{"type" => "trigger", "listenTo" => ["/cardById/*/inPlay"], "condition" => true, "then" => []},
      "this" => %{"type" => "trigger", "listenTo" => ["/cardById/$THIS_ID/inPlay"], "condition" => true, "then" => []},
      "tokens" => %{"type" => "trigger", "listenTo" => ["/cardById/123qwe/tokens/*"], "condition" => true, "then" => []}
    })

    ids = fn path -> RuleMap.get_ids_by_path(game["ruleMap"], path) |> Enum.sort() end
    assert ids.([]) == []
    assert ids.(["cardById", "123qwe", "inPlay"]) == ["this", "wild"]
    assert ids.(["cardById", "456rty", "inPlay"]) == ["wild"]
    assert ids.(["cardById", "123qwe", "prop1"]) == []
    assert ids.(["cardById", "123qwe"]) == []
    assert ids.(["cardById", "123qwe", "tokens", "red"]) == ["tokens"]
    assert ids.(["cardById", "456rty", "tokens", "red"]) == []
    assert RuleMap.get_ids_by_paths([["cardById", "123qwe", "prop1"], ["cardById", "456rty", "inPlay"]], game["ruleMap"]) == ["wild"]
  end

  test "Check trigger rule", %{game: game} do
    game = rule_game(game, %{
      "rule1" => %{
        "type" => "trigger",
        "listenTo" => ["/cardById/123qwe/rotation"],
        "condition" => ["AND", ["PREV", ["NOT_EQUAL", "$GAME.cardById.123qwe.rotation", 0]],
                               ["EQUAL", "$GAME.cardById.123qwe.rotation", 0]],
        "then" => [["SET", "/cardById/456rty/rotation", 0]]
      }
    })
    game = put_in(game, ["cardById", "456rty", "rotation"], 90)

    game = Evaluate.evaluate(game, ["SET", "/cardById/123qwe/rotation", 0])
    assert game["cardById"]["123qwe"]["rotation"] == 0
    assert game["cardById"]["456rty"]["rotation"] == 0

    # The rotation was already 0, so the trigger does not fire again.
    game = Evaluate.evaluate(game, ["SET", "/cardById/456rty/rotation", 90])
    game = Evaluate.evaluate(game, ["SET", "/cardById/123qwe/rotation", 0])
    assert game["cardById"]["456rty"]["rotation"] == 90
  end

  test "Check trigger rule on any card", %{game: game} do
    game = rule_game(game, %{
      "rule" => %{
        "type" => "trigger",
        "listenTo" => ["/cardById/*/rotation"],
        "condition" => ["AND", ["PREV", ["NOT_EQUAL", "$TARGET.rotation", 0]], ["EQUAL", "$TARGET.rotation", 0]],
        "then" => [["SET", "/cardById/456rty/rotation", 0]]
      }
    })
    game = put_in(game, ["cardById", "456rty", "rotation"], 90)

    game = Evaluate.evaluate(game, ["SET", "/cardById/123qwe/rotation", 0])
    assert game["cardById"]["456rty"]["rotation"] == 0
  end

  test "Check FADE_TEXT duration argument", %{game: game} do
    game = put_in(game, ["playerData"], %{"player1" => %{}, "player2" => %{}, "player3" => %{}})

    # No duration given
    game = Evaluate.evaluate(game, ["FADE_TEXT_CARD", "123qwe", "Exhausted"])
    assert game["fadeText"]["card"]["123qwe"] == [%{"text" => "Exhausted", "duration" => nil}]

    # Duration in seconds
    game = Evaluate.evaluate(game, ["FADE_TEXT_CARD", "123qwe", "+2 Attack", 3])
    assert game["fadeText"]["card"]["123qwe"] == [
      %{"text" => "Exhausted", "duration" => nil},
      %{"text" => "+2 Attack", "duration" => 3}
    ]

    # Duration of -1 means "stay until bumped"
    game = Evaluate.evaluate(game, ["FADE_TEXT_PLAYER", "player2", "Your Turn!", -1])
    assert game["fadeText"]["player"]["player2"] == [%{"text" => "Your Turn!", "duration" => -1}]

    # FADE_TEXT_GAME passes the duration through to every player
    game = Evaluate.evaluate(game, ["FADE_TEXT_GAME", "Draw Phase", ["ADD", 2, 0.5]])
    assert game["fadeText"]["player"]["player1"] == [%{"text" => "Draw Phase", "duration" => 2.5}]
    assert game["fadeText"]["player"]["player3"] == [%{"text" => "Draw Phase", "duration" => 2.5}]
    assert game["fadeText"]["player"]["player2"] == [
      %{"text" => "Your Turn!", "duration" => -1},
      %{"text" => "Draw Phase", "duration" => 2.5}
    ]

    # A non-numeric duration is rejected
    assert_raise Evaluate.RecursiveEvaluationError, ~r/duration must be a number/, fn ->
      Evaluate.evaluate(game, ["FADE_TEXT_CARD", "123qwe", "Nope", "soon"])
    end
  end

end
