defmodule DragnCardsGame.GameUiTest do
  use ExUnit.Case, async: true
  use DragnCardsWeb.ConnCase
  alias DragnCards.{Plugins, Plugins.Plugin, Repo}
  alias DragnCards.Users.User
  import Ecto.Query
  alias Jason

  alias DragnCardsGame.{GameUI, Game, Evaluate}

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

  test "Check GAME_SET_VAL", %{game: game} do
    game = Evaluate.evaluate(game, ["GAME_SET_VAL", "/cardById/123qwe/inPlay", true])
    assert game["cardById"]["123qwe"]["inPlay"] == true

    game = Evaluate.evaluate(game, ["DEFINE", "$MY_PATH", ["LIST", "cardById", "123qwe"]])
    game = Evaluate.evaluate(game, ["GAME_SET_VAL", "/$MY_PATH/inPlay", false])
    assert game["cardById"]["123qwe"]["inPlay"] == false


  end

  test "Check variables", %{game: game} do
    assert Evaluate.evaluate(game, "*") == "*"
    assert Evaluate.evaluate(game, "$GAME.cardById.123qwe.inPlay") == false
    assert Evaluate.evaluate(game, "$GAME.cardById.456rty.inPlay") == true
  end

  test "Check path_matches_listenpath?", %{game: game} do
    assert Evaluate.path_matches_listenpath?([], [], game) == true
    assert Evaluate.path_matches_listenpath?(["cardById", "123qwe", "inPlay"], ["cardById", "*", "inPlay"], game) == true
    assert Evaluate.path_matches_listenpath?(["cardById", "123qwe", "inPlay"], ["cardById", "$THIS_ID", "inPlay"], game) == true
    assert Evaluate.path_matches_listenpath?(["cardById", "123qwe", "prop1"], ["cardById", "*", "prop2"], game) == false
    assert Evaluate.path_matches_listenpath?(["cardById", "*", "inPlay"], ["cardById", "123qwe", "inPlay"], game) == false
    assert Evaluate.path_matches_listenpath?(["cardById", "123qwe", "inPlay"], ["cardById", "*"], game) == false
    assert Evaluate.path_matches_listenpath?(["cardById", "123qwe", "inPlay"], [], game) == false
    assert Evaluate.path_matches_listenpath?(["cardById", "123qwe", "tokens", "red"], ["cardById", "123qwe", "tokens", "*"], game) == true
    assert Evaluate.path_matches_listenpath?(["cardById", "123qwe", "tokens", "red"], ["cardById", "123qwe", "tokens", "blue"], game) == false
  end

  test "Check path_matches_listenpaths?", %{game: game} do
    assert Evaluate.path_matches_listenpaths?([], [[]], game) == true
    assert Evaluate.path_matches_listenpaths?(["cardById", "123qwe", "inPlay"], [["cardById", "*", "inPlay"]], game) == true
    assert Evaluate.path_matches_listenpaths?(["cardById", "123qwe", "prop1"], [["cardById", "*", "prop2"],["cardById", "*", "prop2"]], game) == false
    assert Evaluate.path_matches_listenpaths?(["cardById", "123qwe", "prop1"], [["cardById", "*", "prop2"],["cardById", "*", "prop1"]], game) == true
    assert Evaluate.path_matches_listenpaths?(["cardById", "123qwe", "prop1"], [["cardById", "*", "prop2"],["cardById", "$THIS_ID", "prop1"]], game) == true
    assert Evaluate.path_matches_listenpaths?(["cardById", "*", "inPlay"], [["cardById", "123qwe", "inPlay"]], game) == false
    assert Evaluate.path_matches_listenpaths?(["cardById", "123qwe", "inPlay"], [["cardById", "*"]], game) == false
    assert Evaluate.path_matches_listenpaths?(["cardById", "123qwe", "inPlay"], [[]], game) == false
    assert Evaluate.path_matches_listenpaths?(["cardById", "123qwe", "tokens", "red"], [["cardById", "123qwe", "tokens", "*"]], game) == true
    assert Evaluate.path_matches_listenpaths?(["cardById", "123qwe", "tokens", "red"], [["cardById", "123qwe", "tokens", "blue"]], game) == false
  end

  test "Check apply_trigger_rule", %{game: game_old} do

    game_new = Evaluate.evaluate(game_old, ["GAME_SET_VAL", "/cardById/123qwe/rotation", 0])

    assert game_new["cardById"]["123qwe"]["rotation"] == 0

    rule1 = %{
      "type" => "trigger",
      "listenTo" => [["cardById", "123qwe", "rotation"]],
      "condition" => ["AND", ["PREV", ["NOT_EQUAL", "$GAME.cardById.123qwe.rotation", 0]],
        ["EQUAL", "$GAME.cardById.123qwe.rotation", 0]],
      "then" => [
        ["GAME_SET_VAL", "/cardById/456rty/rotation", 0]
      ]
    }

    game_new = Evaluate.apply_automation_rule(rule1, ["cardById", "123qwe", "rotation"], game_old, game_new)

    assert game_new["cardById"]["456rty"]["rotation"] == 0

    rule2 = %{
      "type" => "trigger",
      "listenTo" => [["cardById", "123qwe", "rotation"]],
      "condition" => ["AND", ["PREV", ["NOT_EQUAL", "$GAME.cardById.123qwe.rotation", 0]],
                                         ["EQUAL", "$GAME.cardById.123qwe.rotation", 0]],
      "then" => [
        ["GAME_SET_VAL", "/cardById/456rty/rotation", 90]
      ]
    }

    game_new = Evaluate.apply_automation_rule(rule2, ["cardById", "123qwe", "rotation"], game_new, game_new)

    assert game_new["cardById"]["456rty"]["rotation"] == 0
  end

  test "Check apply_trigger_rule multiple listeners", %{game: game_old} do

    game_new = Evaluate.evaluate(game_old, ["GAME_SET_VAL", "/cardById/123qwe/rotation", 0])

    assert game_new["cardById"]["123qwe"]["rotation"] == 0

    rule = %{
      "type" => "trigger",
      "listenTo" => [["cardById", "123qwe", "rotation"]],
      "condition" => ["AND", ["PREV", ["NOT_EQUAL", "$GAME.cardById.123qwe.rotation", 0]],
                                         ["EQUAL", "$GAME.cardById.123qwe.rotation", 0]],
      "then" => [
        ["GAME_SET_VAL", "/cardById/456rty/rotation", 0]
      ]
    }

    game_new = Evaluate.apply_automation_rule(rule, ["cardById", "123qwe", "rotation"], game_old, game_new)

    assert game_new["cardById"]["456rty"]["rotation"] == 0

  end

  test "Check apply_trigger_rules", %{game: game_old} do

    game_new = Evaluate.evaluate(game_old, ["GAME_SET_VAL", "/cardById/123qwe/rotation", 0])

    assert game_new["cardById"]["123qwe"]["rotation"] == 0

    rules = [%{
      "type" => "trigger",
      "listenTo" => [["cardById", "*", "rotation"]],
      "condition" => ["AND", ["PREV", ["NOT_EQUAL", "$OBJECT.rotation", 0]], ["EQUAL", "$OBJECT.rotation", 0]],
      "then" => [
        ["GAME_SET_VAL", "/cardById/456rty/rotation", 0]
      ]
    }]

    automation = %{
      "this_id" => "123qwe",
      "rules" => rules
    }

    game_new = Evaluate.apply_automation_rules(automation, ["cardById", "123qwe", "rotation"], game_old, game_new)

    assert game_new["cardById"]["456rty"]["rotation"] == 0
  end

end
