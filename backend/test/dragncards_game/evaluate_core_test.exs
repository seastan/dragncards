defmodule DragnCardsGame.EvaluateCoreTest do
  @moduledoc """
  Characterization tests for the DragnLang interpreter core: literals,
  templates, variable scoping, paths, user functions, control flow, state
  updates, automation rules and errors. These pin down existing behavior so
  interpreter optimizations can be checked against it.
  """
  use ExUnit.Case, async: true
  alias DragnCardsGame.{Evaluate, AutomationRules}
  alias DragnCardsGame.Evaluate.RecursiveEvaluationError

  def card(id, group_id, stack_id, extra \\ %{}) do
    Map.merge(
      %{
        "id" => id,
        "currentSide" => "A",
        "sides" => %{
          "A" => %{"name" => "Card #{id}", "type" => "Hero", "cost" => 2},
          "B" => %{"name" => "Back #{id}", "type" => "Back"}
        },
        "groupId" => group_id,
        "stackId" => stack_id,
        "parentCardId" => id,
        "stackParentCardId" => id,
        "inPlay" => true,
        "rotation" => 0,
        "tokens" => %{"damage" => 0},
        "ruleIds" => []
      },
      extra
    )
  end

  def base_game do
    %{
      "roomSlug" => "test-room",
      "pluginId" => 1,
      "pluginName" => "Test Plugin",
      "numPlayers" => 2,
      "firstPlayer" => "player1",
      "currentScopeIndex" => 0,
      "variables" => %{},
      "functions" => %{},
      "messages" => [],
      "ruleById" => %{},
      "ruleMap" => %{},
      "automationEnabled" => true,
      "playerUi" => %{"playerN" => "player1", "activeCardId" => nil},
      "playerInfo" => %{"player1" => %{"alias" => "Alice"}, "player2" => %{"alias" => "Bob"}},
      "playerData" => %{
        "player1" => %{"id" => "player1", "threat" => 25},
        "player2" => %{"id" => "player2", "threat" => 30}
      },
      "groupById" => %{
        "hand" => %{"id" => "hand", "stackIds" => ["s1", "s2"]},
        "play" => %{"id" => "play", "stackIds" => ["s3"]},
        "empty" => %{"id" => "empty", "stackIds" => []}
      },
      "stackById" => %{
        "s1" => %{"id" => "s1", "cardIds" => ["c1", "c4"]},
        "s2" => %{"id" => "s2", "cardIds" => ["c2"]},
        "s3" => %{"id" => "s3", "cardIds" => ["c3"]}
      },
      "cardById" => %{
        "c1" => card("c1", "hand", "s1", %{"inPlay" => false}),
        "c2" => card("c2", "hand", "s2", %{"inPlay" => false, "currentSide" => "B"}),
        "c3" => card("c3", "play", "s3", %{"tokens" => %{"damage" => 2}}),
        "c4" => card("c4", "hand", "s1", %{"inPlay" => false, "parentCardId" => "c1"})
      }
    }
  end

  def ev(game, code), do: Evaluate.evaluate(game, code)
  def ev(code), do: Evaluate.evaluate(base_game(), code)

  def error_message(fun) do
    try do
      fun.()
      flunk("expected an error")
    rescue
      e in RecursiveEvaluationError -> e.message
    end
  end

  describe "literals" do
    test "numbers, booleans and nil evaluate to themselves" do
      for v <- [0, 1, -5, 3.5, true, false, nil], do: assert(ev(v) === v)
    end

    test "plain strings evaluate to themselves" do
      for s <- ["", "hello", "a b c", "costs $5", "x/y", "50%", "}}{{"] do
        assert ev(s) == s
      end
    end

    test "maps are returned without evaluating their contents" do
      m = %{"a" => ["ADD", 1, 2], "b" => "$PLAYER_N"}
      assert ev(m) == m
    end

    test "empty list evaluates to itself" do
      assert ev([]) == []
    end

    test "MapSets evaluate to themselves" do
      s = MapSet.new([1, 2])
      assert ev(s) == s
    end
  end

  describe "string templates" do
    test "replaces {{}} with evaluated variables" do
      assert ev("Hi {{$PLAYER_N}}!") == "Hi player1!"
    end

    test "replaces multiple templates" do
      game = ev(base_game(), ["DEFINE", "$A", 1]) |> ev(["DEFINE", "$B", "two"])
      assert ev(game, "{{$A}}-{{$B}}-{{$A}}") == "1-two-1"
    end

    test "templates can use deep paths" do
      assert ev("dmg={{$GAME.cardById.c3.tokens.damage}}") == "dmg=2"
    end

    test "nil renders as empty string and lists/maps are inspected" do
      game =
        base_game()
        |> ev(["DEFINE", "$N", nil])
        |> ev(["DEFINE", "$L", ["LIST", 1, 2]])
        |> ev(["DEFINE", "$M", %{"k" => "v"}])

      assert ev(game, "[{{$N}}]") == "[]"
      assert ev(game, "{{$L}}") == "[1, 2]"
      assert ev(game, "{{$M}}") == ~s(%{"k" => "v"})
    end

    test "a template that produces a variable name is then evaluated as a variable" do
      game = base_game() |> ev(["DEFINE", "$NAME", ["POINTER", "$TARGET_VAR"]]) |> ev(["DEFINE", "$TARGET_VAR", 42])
      assert ev(game, "{{$NAME}}") == 42
    end

    test "unterminated or multi-line braces are left alone" do
      assert ev("{{$PLAYER_N") == "{{$PLAYER_N"
      assert ev("{{$PLAYER_N\n}}") == "{{$PLAYER_N\n}}"
    end

    test "templates with literal contents" do
      assert ev("a{{b}}c") == "abc"
    end
  end

  describe "variables and scoping" do
    test "DEFINE sets a global variable" do
      game = ev(base_game(), ["DEFINE", "$X", ["ADD", 1, 2]])
      assert game["variables"]["$X"] == 3
      assert ev(game, "$X") == 3
    end

    test "VAR is visible to later statements in the same action list" do
      game = ev(base_game(), [["VAR", "$X", 5], ["DEFINE", "$OUT", ["MULTIPLY", "$X", 2]]])
      assert game["variables"]["$OUT"] == 10
    end

    test "VAR inside a nested action list does not leak out" do
      game =
        ev(base_game(), [
          [["VAR", "$INNER", 1]],
          ["DEFINE", "$SEEN", ["DEFINED", "$INNER"]]
        ])

      assert game["variables"]["$SEEN"] == false
    end

    test "inner VAR shadows outer VAR without changing it" do
      game =
        ev(base_game(), [
          ["VAR", "$X", "outer"],
          [["VAR", "$X", "inner"], ["DEFINE", "$IN", "$X"]],
          ["DEFINE", "$OUT", "$X"]
        ])

      assert game["variables"]["$IN"] == "inner"
      assert game["variables"]["$OUT"] == "outer"
    end

    test "local VAR shadows a global DEFINE" do
      game =
        ev(base_game(), [
          ["DEFINE", "$X", "global"],
          [["VAR", "$X", "local"], ["DEFINE", "$IN", "$X"]],
          ["DEFINE", "$OUT", "$X"]
        ])

      assert game["variables"]["$IN"] == "local"
      assert game["variables"]["$OUT"] == "global"
    end

    test "UPDATE_VAR changes the variable in the scope where it was defined" do
      game =
        ev(base_game(), [
          ["VAR", "$X", 1],
          [["UPDATE_VAR", "$X", 7]],
          ["DEFINE", "$OUT", "$X"]
        ])

      assert game["variables"]["$OUT"] == 7
    end

    test "UPDATE_VAR on an undefined variable raises" do
      msg = error_message(fn -> ev([["UPDATE_VAR", "$NOPE", 1]]) end)
      assert msg =~ "$NOPE"
    end

    test "INCREASE_VAR and DECREASE_VAR" do
      game =
        ev(base_game(), [
          ["VAR", "$X", 10],
          ["INCREASE_VAR", "$X", 5],
          [["DECREASE_VAR", "$X", 3]],
          ["DEFINE", "$OUT", "$X"]
        ])

      assert game["variables"]["$OUT"] == 12
    end

    test "MULTI_VAR defines several variables, evaluating values" do
      game = ev(base_game(), [["MULTI_VAR", "$A", ["ADD", 1, 1], "$B", "$PLAYER_N"], ["DEFINE", "$OUT", ["LIST", "$A", "$B"]]])
      assert game["variables"]["$OUT"] == [2, "player1"]
    end

    test "MULTI_VAR_NO_EVAL does not evaluate values" do
      game = ev(base_game(), [["MULTI_VAR_NO_EVAL", "$A", ["ADD", 1, 1]], ["DEFINE", "$OUT", ["POINTER", "$A"]]])
      assert game["variables"]["$OUT"] == "$A"
      game = ev(base_game(), [["MULTI_VAR_NO_EVAL", "$A", ["ADD", 1, 1]], ["DEFINE", "$OUT", "$A"]])
      assert game["variables"]["$OUT"] == ["ADD", 1, 1]
    end

    test "DEFINED" do
      game = ev(base_game(), ["DEFINE", "$X", 1]) |> ev(["DEFINE", "$NIL", nil])
      assert ev(game, ["DEFINED", "$X"]) == true
      assert ev(game, ["DEFINED", "$NIL"]) == false
      assert ev(game, ["DEFINED", "$NOPE"]) == false
      assert ev(game, ["DEFINED", "$PLAYER_N"]) == true
      assert ev(game, ["DEFINED", "$ACTIVE_CARD_ID"]) == false
    end

    test "undefined variable raises" do
      assert error_message(fn -> ev("$NOPE") end) =~ "Variable $NOPE is undefined."
    end

    test "user variables shadow built-in variables" do
      game = ev(base_game(), ["DEFINE", "$PLAYER_N", "player2"])
      assert ev(game, "$PLAYER_N") == "player2"
      assert ev(game, "$ALIAS_N") == "[player2/Bob]"
    end

    test "top-level VAR persists in scope 1 between evaluations" do
      game = ev(base_game(), ["VAR", "$TOP", 9])
      assert game["variables"]["1"] == %{"$TOP" => 9}
      assert ev(game, "$TOP") == 9
      assert ev(game, ["ADD", "$TOP", 1]) == 10
    end

    test "nested evaluation leaves only scope 1 behind and restores the scope index" do
      game =
        ev(base_game(), [
          ["VAR", "$A", 1],
          [["VAR", "$B", 2], [["VAR", "$C", 3]]],
          ["DEFINE", "$OUT", "$A"]
        ])

      assert game["currentScopeIndex"] == 0
      assert game["variables"] == %{"$OUT" => 1, "1" => %{}}
    end

    test "scope index is restored after every kind of evaluation" do
      for code <- [["LOG", "x"], [["VAR", "$X", 1]], ["DEFINE", "$Y", 2], ["SET", "/playerData/player1/threat", 1]] do
        assert ev(code)["currentScopeIndex"] == 0
      end

      game = put_in(base_game(), ["currentScopeIndex"], 3) |> put_in(["variables", "3"], %{})
      assert ev(game, ["LOG", "x"])["currentScopeIndex"] == 3
    end

    test "values computed in non-game expressions do not change the game" do
      game = base_game()
      assert ev(game, ["LIST", ["ADD", 1, 2], "$PLAYER_N"]) == [3, "player1"]
    end
  end

  describe "built-in variables" do
    test "$GAME returns the game" do
      game = base_game()
      result = ev(game, "$GAME")
      assert Evaluate.is_game(result)
      assert result["cardById"] == game["cardById"]
    end

    test "$PLAYER_N, $ALIAS_N, $PLAYER_ORDER" do
      assert ev("$PLAYER_N") == "player1"
      assert ev("$ALIAS_N") == "[player1/Alice]"
      assert ev("$PLAYER_ORDER") == ["player1", "player2"]
    end

    test "collections" do
      game = base_game()
      assert ev(game, "$CARD_BY_ID") == game["cardById"]
      assert ev(game, "$GROUP_BY_ID") == game["groupById"]
      assert ev(game, "$STACK_BY_ID") == game["stackById"]
      assert ev(game, "$PLAYER_DATA") == game["playerData"]
    end

    test "$ACTIVE_CARD and friends" do
      game = put_in(base_game(), ["playerUi", "activeCardId"], "c2")
      assert ev(game, "$ACTIVE_CARD_ID") == "c2"
      assert ev(game, "$ACTIVE_CARD")["id"] == "c2"
      assert ev(game, "$ACTIVE_SIDE") == "B"
      assert ev(game, "$ACTIVE_FACE")["name"] == "Back c2"
      assert ev(game, "$ACTIVE_TOKENS") == %{"damage" => 0}
      assert ev(game, "$ACTIVE_GROUP_ID") == "hand"
      assert ev(game, "$ACTIVE_GROUP")["id"] == "hand"
    end

    test "$ACTIVE_CARD_ID is undefined without an active card" do
      assert error_message(fn -> ev("$ACTIVE_CARD_ID") end) =~ "$ACTIVE_CARD_ID is undefined"
    end

    test "$PLAYER_N is undefined without a player" do
      game = put_in(base_game(), ["playerUi", "playerN"], nil)
      assert error_message(fn -> ev(game, "$PLAYER_N") end) =~ "$PLAYER_N is undefined"
    end
  end

  describe "paths" do
    test "dotted access into the game" do
      assert ev("$GAME.cardById.c1.sides.A.name") == "Card c1"
      assert ev("$GAME.playerData.player2.threat") == 30
    end

    test "missing keys give nil, and nil propagates" do
      assert ev("$GAME.cardById.nope") == nil
      assert ev("$GAME.cardById.nope.sides.A") == nil
      assert ev("$GAME.cardById.c1.nope") == nil
    end

    test "dotted access into variables" do
      game = ev(base_game(), ["DEFINE", "$M", %{"a" => %{"b" => [10, 20, 30]}}])
      assert ev(game, "$M.a.b") == [10, 20, 30]
      assert ev(game, "$M.a.b.[0]") == 10
      assert ev(game, "$M.a.b.[2]") == 30
      assert ev(game, "$M.a.b.[-1]") == 30
    end

    test "index expressions can use variables" do
      game = ev(base_game(), ["DEFINE", "$L", ["LIST", "x", "y", "z"]]) |> ev(["DEFINE", "$I", 1])
      assert ev(game, "$L.[$I]") == "y"
    end

    test "index out of range and non-list indexing raise" do
      game = ev(base_game(), ["DEFINE", "$L", ["LIST", 1]]) |> ev(["DEFINE", "$M", %{"a" => 1}])
      assert error_message(fn -> ev(game, "$L.[5]") end) =~ "Tried to access index 5 on an array of length 1"
      assert error_message(fn -> ev(game, "$M.[0]") end) =~ "non-array"
    end

    test "key access on a non-object raises" do
      game = ev(base_game(), ["DEFINE", "$S", "str"])
      assert error_message(fn -> ev(game, "$S.key") end) =~ "Tried to access key 'key' of a non-object"
    end

    test "dynamic keys" do
      game = ev(base_game(), ["DEFINE", "$CID", "c3"])
      assert ev(game, "$GAME.cardById.$CID.tokens.damage") == 2
    end

    test "special path keys" do
      assert ev("$GAME.cardById.c2.currentFace.name") == "Back c2"
      assert ev("$GAME.groupById.hand.parentCardIds") == ["c1", "c2"]
      assert Enum.map(ev("$GAME.groupById.hand.parentCards"), & &1["id"]) == ["c1", "c2"]
      assert ev("$GAME.groupById.hand.parentCardIds.[1]") == "c2"
      assert ev("$GAME.groupById.empty.parentCardIds") == []
      assert ev("$GAME.cardById.c4.parentCard.id") == "c1"
      assert ev("$GAME.cardById.c4.stackParentCard.id") == "c4"
    end

    test "parentCardIds on a non-group raises" do
      assert error_message(fn -> ev("$GAME.cardById.c1.parentCardIds") end) =~ "non-group"
    end

    test "slash paths become lists with variables resolved" do
      game = ev(base_game(), ["DEFINE", "$CID", "c3"])
      assert ev(game, "/cardById/$CID/rotation") == ["cardById", "c3", "rotation"]
      assert ev(game, "/a") == ["a"]
    end

    test "slash paths flatten list-valued segments" do
      game = ev(base_game(), ["DEFINE", "$P", ["LIST", "cardById", "c1"]])
      assert ev(game, "/$P/inPlay") == ["cardById", "c1", "inPlay"]
    end

    test "OBJ_GET_BY_PATH" do
      assert ev(["OBJ_GET_BY_PATH", %{"a" => %{"b" => 1}}, ["LIST", "a", "b"]]) == 1
    end
  end

  describe "user-defined functions" do
    def with_functions(functions), do: Map.put(base_game(), "functions", functions)

    test "functions with positional and default args" do
      game =
        with_functions(%{
          "DOUBLE" => %{"args" => ["$X"], "code" => ["MULTIPLY", "$X", 2]},
          "ADD_DEFAULT" => %{"args" => ["$A", %{"$B" => 10}], "code" => ["ADD", "$A", "$B"]}
        })

      assert ev(game, ["DOUBLE", 21]) == 42
      assert ev(game, ["ADD_DEFAULT", 1]) == 11
      assert ev(game, ["ADD_DEFAULT", 1, 2]) == 3
    end

    test "arguments are evaluated before the call" do
      game = with_functions(%{"ID" => %{"args" => ["$X"], "code" => "$X"}})
      assert ev(game, ["ID", ["ADD", 2, 3]]) == 5
      assert ev(game, ["ID", "$PLAYER_N"]) == "player1"
    end

    test "too many or too few arguments raise" do
      game = with_functions(%{"ONE" => %{"args" => ["$X"], "code" => "$X"}})
      assert error_message(fn -> ev(game, ["ONE", 1, 2]) end) =~ "expects 1 arguments, but got 2"
      assert error_message(fn -> ev(game, ["ONE"]) end) =~ "expects 1 arguments, but got 0"
    end

    test "recursion" do
      game =
        with_functions(%{
          "FACT" => %{
            "args" => ["$N"],
            "code" => ["COND", ["LESS_EQUAL", "$N", 1], 1, true, ["MULTIPLY", "$N", ["FACT", ["SUBTRACT", "$N", 1]]]]
          }
        })

      assert ev(game, ["FACT", 6]) == 720
    end

    test "functions can modify the game, and their arguments do not leak" do
      game =
        with_functions(%{
          "SET_THREAT" => %{"args" => ["$P", "$T"], "code" => [["SET", "/playerData/$P/threat", "$T"]]}
        })

      game = ev(game, [["SET_THREAT", "player2", 7], ["DEFINE", "$LEAK", ["DEFINED", "$T"]]])
      assert game["playerData"]["player2"]["threat"] == 7
      assert game["variables"]["$LEAK"] == false
    end

    test "FUNCTION defines a function at runtime" do
      game = ev(base_game(), ["FUNCTION", "TRIPLE", "$X", ["MULTIPLY", "$X", 3]])
      assert ev(game, ["TRIPLE", 4]) == 12
    end

    test "FUNCTION names must be upper case" do
      assert error_message(fn -> ev(["FUNCTION", "lower", "$X", "$X"]) end) =~ "not all caps"
    end

    test "user functions take precedence over built-ins" do
      game = with_functions(%{"ADD" => %{"args" => ["$A", "$B"], "code" => "custom"}})
      assert ev(game, ["ADD", 1, 2]) == "custom"
    end

    test "function name from a variable" do
      game = ev(base_game(), ["DEFINE", "$F", "ADD"])
      assert ev(game, ["$F", 2, 3]) == 5
    end

    test "built-in names are case-insensitive" do
      assert ev(["add", 2, 3]) == 5
      assert ev(["Multiply", 2, 3]) == 6
    end

    test "unknown functions raise" do
      assert error_message(fn -> ev(["NOT_A_FUNCTION", 1]) end) =~ ~s(Function "NOT_A_FUNCTION" not recognized)
    end

    test "a list starting with a non-string is not a valid call" do
      assert error_message(fn -> ev([1, 2, 3]) end) =~ "not recognized"
    end
  end

  describe "control flow" do
    test "COND picks the first true branch" do
      assert ev(["COND", false, "a", ["EQUAL", 1, 1], "b", true, "c"]) == "b"
      assert ev(["COND", nil, "a", 1, "one"]) == "one"
    end

    test "COND with no true branch returns the game" do
      game = base_game()
      assert ev(game, ["COND", false, "a"]) == put_in(game, ["variables", "1"], %{})
    end

    test "COND requires boolean conditions and an even number of args" do
      assert error_message(fn -> ev(["COND", "yes", "a"]) end) =~ "Expected a boolean or null result"
      assert error_message(fn -> ev(["COND", true]) end) =~ "expected at least 2 arguments"
      assert error_message(fn -> ev(["COND", true, "a", false]) end) =~ "even number"
    end

    test "COND evaluates only the chosen branch" do
      game = ev(base_game(), ["COND", true, ["LOG", "chosen"], true, ["LOG", "not chosen"]])
      assert game["messages"] == ["chosen"]
    end

    test "AND / OR / NOT short-circuit" do
      assert ev(["AND", true, ["EQUAL", 1, 1]]) == true
      assert ev(["AND", true, false, ["UNDEFINED_FN"]]) == false
      assert ev(["OR", false, true, ["UNDEFINED_FN"]]) == true
      assert ev(["OR", false, nil]) == false
      assert ev(["NOT", false]) == true
      assert ev(["NOT", nil]) == true
      assert ev(["AND"]) == true
      assert ev(["OR"]) == false
    end

    test "WHILE" do
      game = ev(base_game(), [["VAR", "$I", 0], ["WHILE", ["LESS_THAN", "$I", 5], [["INCREASE_VAR", "$I", 1], ["LOG", "{{$I}}"]]]])
      assert game["messages"] == ["1", "2", "3", "4", "5"]
    end

    test "FOR_EACH_VAL over lists and sets" do
      game = ev(base_game(), ["FOR_EACH_VAL", "$V", ["LIST", "a", "b"], [["LOG", "{{$V}}"]]])
      assert game["messages"] == ["a", "b"]
      game = ev(base_game(), ["FOR_EACH_VAL", "$V", MapSet.new([2, 1]), [["LOG", "{{$V}}"]]])
      assert game["messages"] == ["1", "2"]
    end

    test "FOR_EACH_VAL threads the game through iterations" do
      game =
        ev(base_game(), [
          ["VAR", "$SUM", 0],
          ["FOR_EACH_VAL", "$V", ["LIST", 1, 2, 3], [["UPDATE_VAR", "$SUM", ["ADD", "$SUM", "$V"]]]],
          ["DEFINE", "$OUT", "$SUM"]
        ])

      assert game["variables"]["$OUT"] == 6
    end

    test "FOR_EACH_VAL rejects non-lists" do
      assert error_message(fn -> ev(["FOR_EACH_VAL", "$V", 5, [["LOG", "x"]]]) end) =~ "list must be a list or set"
    end

    test "FOR_EACH_KEY_VAL iterates maps in key order" do
      game = ev(base_game(), ["FOR_EACH_KEY_VAL", "$K", "$V", %{"b" => 2, "a" => 1}, [["LOG", "{{$K}}={{$V}}"]]])
      assert game["messages"] == ["a=1", "b=2"]
    end

    test "FOR_EACH_START_STOP_STEP" do
      game = ev(base_game(), ["FOR_EACH_START_STOP_STEP", "$I", 1, 8, 3, [["LOG", "{{$I}}"]]])
      assert game["messages"] == ["1", "4", "7"]
      game = ev(base_game(), ["FOR_EACH_START_STOP_STEP", "$I", 0, 0, 1, [["LOG", "{{$I}}"]]])
      assert game["messages"] == []
    end

    test "a nested action list returns the final game" do
      game = ev(base_game(), [["LOG", "a"], [["LOG", "b"], [["LOG", "c"]]], ["LOG", "d"]])
      assert game["messages"] == ["a", "b", "c", "d"]
    end

    test "a non-game statement in an action list replaces the accumulator" do
      assert ev(base_game(), [["LOG", "a"], ["ADD", 1, 2]]) == 3
    end

    test "ACTION_LIST with an inline list" do
      game = ev(base_game(), ["ACTION_LIST", [["LOG", "inline"]]])
      assert game["messages"] == ["inline"]
    end

    test "ACTION_LIST with a variable holding code" do
      game = base_game() |> ev(["DEFINE", "$CODE", ["POINTER", [["LOG", "from var"]]]])
      assert ev(game, ["ACTION_LIST", "$CODE"])["messages"] == ["from var"]
    end

    test "POINTER returns code unevaluated" do
      assert ev(["POINTER", ["ADD", 1, 2]]) == ["ADD", 1, 2]
    end

    test "ABORT raises with its message" do
      assert error_message(fn -> ev(["ABORT", "stop ", "$PLAYER_N"]) end) =~ "ABORT: stop player1"
    end

    test "PREV evaluates against prev_game" do
      prev = put_in(base_game(), ["playerData", "player1", "threat"], 1)
      game = Map.put(base_game(), "prev_game", prev)
      assert ev(game, ["PREV", "$GAME.playerData.player1.threat"]) == 1
      assert ev(game, "$GAME.playerData.player1.threat") == 25
    end
  end

  describe "values" do
    test "arithmetic treats nil as zero" do
      assert ev(["ADD", nil, 2]) == 2
      assert ev(["SUBTRACT", 10, 4]) == 6
      assert ev(["MULTIPLY", 3, 4]) == 12
      assert ev(["DIVIDE", 7, 2]) == 3.5
      assert ev(["MODULO", 7, 3]) == 1
      assert ev(["MAX", ["LIST", 1, 9, 4]]) == 9
      assert ev(["MIN", ["LIST", 3, 1, 9]]) == 1
    end

    test "comparisons" do
      assert ev(["EQUAL", "a", "a"]) == true
      assert ev(["EQUAL", 1, 1.0]) == true
      assert ev(["NOT_EQUAL", 1, 2]) == true
      assert ev(["GREATER_THAN", 2, 1]) == true
      assert ev(["GREATER_EQUAL", 2, 2]) == true
      assert ev(["LESS_THAN", 2, 1]) == false
      assert ev(["LESS_EQUAL", nil, 0]) == true
    end

    test "comparing non-numbers raises" do
      assert error_message(fn -> ev(["LESS_THAN", "a", 1]) end) =~ "not a number"
    end

    test "LIST evaluates each element in order" do
      assert ev(["LIST", 1, ["ADD", 1, 1], "$PLAYER_N", "{{$PLAYER_N}}", ["LIST"]]) == [1, 2, "player1", "player1", []]
      assert ev(["LIST" | Enum.to_list(1..300)]) == Enum.to_list(1..300)
    end

    test "list functions" do
      assert ev(["APPEND", ["LIST", 1], 2]) == [1, 2]
      assert ev(["APPEND", nil, 2]) == [2]
      assert ev(["CONCAT_LISTS", ["LIST", 1], ["LIST", 2, 3]]) == [1, 2, 3]
      assert ev(["AT_INDEX", ["LIST", "a", "b"], 1]) == "b"
      assert ev(["AT_INDEX", nil, 1]) == nil
      assert ev(["GET_INDEX", ["LIST", "a", "b"], "b"]) == 1
      assert ev(["IN_LIST", ["LIST", "a", "b"], "b"]) == true
      assert ev(["IN_LIST", nil, "b"]) == false
      assert ev(["LENGTH", ["LIST", 1, 2, 3]]) == 3
      assert ev(["LENGTH", "abcd"]) == 4
      assert ev(["REVERSE_LIST", ["LIST", 1, 2, 3]]) == [3, 2, 1]
      assert ev(["JOIN_STRING", "a", "b"]) == "ab"
    end

    test "map functions" do
      assert ev(["MAP_PUT", %{"a" => 1}, "b", 2]) == %{"a" => 1, "b" => 2}
      assert ev(["MAP_GET", %{"a" => 1}, "a"]) == 1
      assert ev(["MAP_GET", %{"a" => 1}, "z", "dflt"]) == "dflt"
      assert ev(["OBJ_GET_VAL", %{"a" => 3}, "a"]) == 3
      assert ev(["OBJ_SET_VAL", %{"a" => 3}, "a", 4]) == %{"a" => 4}
      assert ev(["OBJ_SET_VAL", %{"a" => %{"b" => 1}}, ["LIST", "a"], "b", 2]) == %{"a" => %{"b" => 2}}
      assert error_message(fn -> ev(["MAP_PUT", "str", "b", 2]) end) =~ "object must be an object"
    end
  end

  describe "card queries" do
    test "FILTER_CARDS and ONE_CARD" do
      ids = ev(["FILTER_CARDS", "$C", ["EQUAL", "$C.groupId", "hand"]]) |> Enum.map(& &1["id"]) |> Enum.sort()
      assert ids == ["c1", "c2", "c4"]
      assert ev(["ONE_CARD", "$C", ["EQUAL", "$C.currentSide", "B"]])["id"] == "c2"
      assert ev(["ONE_CARD", "$C", false]) == nil
    end

    test "FILTER_CARDS conditions can use outer variables" do
      game = ev(base_game(), ["DEFINE", "$G", "play"])
      assert ev(game, ["FILTER_CARDS", "$C", ["EQUAL", "$C.groupId", "$G"]]) |> Enum.map(& &1["id"]) == ["c3"]
    end
  end

  describe "state updates" do
    test "SET with list and slash paths" do
      game = ev(base_game(), ["SET", ["LIST", "playerData", "player1", "threat"], 5])
      assert game["playerData"]["player1"]["threat"] == 5
      game = ev(base_game(), [["VAR", "$P", "player2"], ["SET", "/playerData/$P/threat", ["ADD", "$GAME.playerData.$P.threat", 1]]])
      assert game["playerData"]["player2"]["threat"] == 31
    end

    test "SET of an unchanged value only adds the empty top-level scope" do
      game = base_game()
      assert ev(game, ["SET", "/playerData/player1/threat", 25]) === put_in(game, ["variables", "1"], %{})
    end

    test "SET at a nonexistent path raises" do
      assert error_message(fn -> ev(["SET", "/nope/nope/x", 1]) end) =~ "nonexistent path"
      assert error_message(fn -> ev(["SET", "/playerData/player1/threat/x", 1]) end) =~ "does not point to a map"
    end

    test "SET of a top-level key" do
      assert ev(["SET", "/newKey", 1])["newKey"] == 1
    end

    test "UNSET removes a key" do
      game = ev(base_game(), ["UNSET", "/playerData/player2"])
      assert Map.keys(game["playerData"]) == ["player1"]
    end

    test "GET" do
      assert ev(["GET", "/playerData/player2/threat"]) == 30
    end

    test "INCREASE_VAL and DECREASE_VAL" do
      game = ev(base_game(), [["INCREASE_VAL", "/playerData/player1/threat", 3], ["DECREASE_VAL", "/playerData/player2/threat", 4]])
      assert game["playerData"]["player1"]["threat"] == 28
      assert game["playerData"]["player2"]["threat"] == 26
    end

    test "LOG appends messages with templates and multiple statements" do
      game = ev(base_game(), [["LOG", "{{$ALIAS_N}} did ", "a thing"], ["LOG", ["ADD", 1, 2]]])
      assert game["messages"] == ["[player1/Alice] did a thing", "3"]
    end
  end

  describe "automation rules" do
    def game_with_rules(rules), do: AutomationRules.implement_game_rules(base_game(), rules)

    test "trigger rule fires when its listened path changes and the condition holds" do
      game =
        game_with_rules(%{
          "watchThreat" => %{
            "type" => "trigger",
            "listenTo" => ["/playerData/*/threat"],
            "condition" => ["GREATER_THAN", "$TARGET.threat", 40],
            "then" => [["LOG", "{{$TARGET_ID}} is high: {{$TARGET.threat}}"]]
          }
        })

      game = ev(game, ["SET", "/playerData/player2/threat", 45])
      assert game["messages"] == ["player2 is high: 45"]
      game = ev(game, ["SET", "/playerData/player1/threat", 10])
      assert game["messages"] == ["player2 is high: 45"]
    end

    test "trigger rules can compare with the previous state" do
      game =
        game_with_rules(%{
          "drop" => %{
            "type" => "trigger",
            "listenTo" => ["/playerData/*/threat"],
            "condition" => ["LESS_THAN", "$TARGET.threat", ["PREV", "$TARGET.threat"]],
            "then" => [["LOG", "dropped from {{$GAME.prev_game.playerData.player1.threat}}"]]
          }
        })

      game = ev(game, ["SET", "/playerData/player1/threat", 20])
      assert game["messages"] == ["dropped from 25"]
      assert game["prev_game"] == nil
      game = ev(game, ["SET", "/playerData/player1/threat", 21])
      assert game["messages"] == ["dropped from 25"]
    end

    test "passive rules run onDo and offDo on transitions" do
      game =
        game_with_rules(%{
          "danger" => %{
            "type" => "passive",
            "listenTo" => ["/playerData/player1/threat"],
            "condition" => ["GREATER_EQUAL", "$GAME.playerData.player1.threat", 40],
            "onDo" => [["LOG", "on"]],
            "offDo" => [["LOG", "off"]]
          }
        })

      game =
        game
        |> ev(["SET", "/playerData/player1/threat", 41])
        |> ev(["SET", "/playerData/player1/threat", 45])
        |> ev(["SET", "/playerData/player1/threat", 10])

      assert game["messages"] == ["on", "off"]
    end

    test "rules do not fire when automation is disabled" do
      game =
        game_with_rules(%{
          "r" => %{"type" => "trigger", "listenTo" => ["/playerData/*/threat"], "condition" => true, "then" => [["LOG", "fired"]]}
        })
        |> Map.put("automationEnabled", false)

      assert ev(game, ["SET", "/playerData/player1/threat", 1])["messages"] == []
    end

    test "rules can trigger other rules" do
      game =
        game_with_rules(%{
          "first" => %{
            "type" => "trigger",
            "listenTo" => ["/playerData/player1/threat"],
            "condition" => true,
            "then" => [["SET", "/playerData/player2/threat", 0]]
          },
          "second" => %{
            "type" => "trigger",
            "listenTo" => ["/playerData/player2/threat"],
            "condition" => true,
            "then" => [["LOG", "second fired"]]
          }
        })

      game = ev(game, ["SET", "/playerData/player1/threat", 1])
      assert game["playerData"]["player2"]["threat"] == 0
      assert game["messages"] == ["second fired"]
    end
  end

  describe "errors" do
    test "errors are RecursiveEvaluationErrors that carry the innermost message" do
      msg = error_message(fn -> ev([["LOG", "ok"], ["LIST", 1, ["ADD", "$NOPE", 1]]]) end)
      assert msg =~ "Variable $NOPE is undefined."
    end

    test "errors inside user functions mention the function" do
      game = Map.put(base_game(), "functions", %{"BROKEN" => %{"args" => [], "code" => ["ABORT", "inside"]}})
      msg = error_message(fn -> ev(game, [["BROKEN"]]) end)
      assert msg =~ "ABORT: inside"
      assert msg =~ "BROKEN"
    end

    test "argument count errors" do
      assert error_message(fn -> ev(["FOR_EACH_START_STOP_STEP", "$I", 0, 1]) end) =~ "expected 5 arguments, but got 3"
    end

    test "error messages show the call path, outermost first, ending at the failure" do
      game = Map.put(base_game(), "functions", %{"OUTER" => %{"args" => ["$X"], "code" => [["LOG", "ok"], ["INNER", "$X"]]},
                                                 "INNER" => %{"args" => ["$Y"], "code" => ["ADD", "$Y", "$NOPE"]}})
      msg = error_message(fn -> ev(game, ["OUTER", 1]) end)
      assert msg == ": Variable $NOPE is undefined. | Trace: OUTER > index 1 > INNER > ADD > right > $NOPE"
    end

    test "errors keep the original message and the trace as fields" do
      e = assert_raise RecursiveEvaluationError, fn -> ev([["LOG", "a"], ["ABORT", "boom"]]) end
      assert e.inner_message == "ABORT: boom"
      assert e.trace == [{"index", 1}, "ABORT"]
      assert e.message == ": ABORT: boom | Trace: index 1 > ABORT"
    end

    test "dotted variables end the trace without internal function names" do
      game = ev(base_game(), ["DEFINE", "$S", "str"])
      msg = error_message(fn -> ev(game, ["EQUAL", "$S.key", 1]) end)
      assert msg == ": Tried to access key 'key' of a non-object: \"str\". | Trace: EQUAL > left > $S.key"
    end

    test "exceptions without a message field are described, not inspected" do
      msg = error_message(fn -> ev(["ADD", "x", 1]) end)
      assert msg == ": bad argument in arithmetic expression | Trace: ADD"
    end

    test "user function arguments are labelled by name" do
      game = Map.put(base_game(), "functions", %{"F" => %{"args" => ["$A"], "code" => "$A"}})
      msg = error_message(fn -> ev(game, ["F", "$NOPE"]) end)
      assert msg == ": Variable $NOPE is undefined. | Trace: F > args > MULTI_VAR > value $A > $NOPE"
    end

    test "errors re-wrapped by a function keep a single trace" do
      e = %RecursiveEvaluationError{message: ": inner | Trace: A > B"}
      assert Evaluate.error_text(e) == "inner | Trace: A > B"
      assert Evaluate.error_text(%RuntimeError{message: "plain"}) == "plain"
    end

    test "long traces are shortened" do
      trace = Enum.map(1..100, &{"index", &1}) |> Enum.reverse()
      text = Evaluate.format_trace(trace)
      assert String.starts_with?(text, "index 1 > index 2 > index 3 > index 4 > index 5 > ... > index 67")
      assert String.ends_with?(text, "> index 100")
    end

    test "evaluate_with_timeout returns the game on success" do
      game = Evaluate.evaluate_with_timeout(base_game(), [["LOG", "hi"]])
      assert game["messages"] == ["hi"]
      assert game["currentScopeIndex"] == 0
    end

    test "evaluate_with_timeout reports errors on the original game" do
      game = base_game() |> Map.put("currentScopeIndex", 0)
      result = Evaluate.evaluate_with_timeout(game, [["SET", "/playerData/player1/threat", 1], ["ABORT", "nope"]], "my action")
      assert result["playerData"]["player1"]["threat"] == 25
      assert [message] = result["messages"]
      assert message =~ "ABORT: nope | Trace: my action > index 1 > ABORT"
    end

    test "evaluate_with_timeout stops runaway loops and says where they were" do
      game = base_game()
      {time_us, result} =
        :timer.tc(fn ->
          Evaluate.evaluate_with_timeout(game, [["VAR", "$I", 0], ["WHILE", true, [["INCREASE_VAR", "$I", 1]]]], "loop", 100)
        end)

      assert time_us < 2_000_000
      assert [message] = result["messages"]
      assert message =~ "Action timed out. | Trace: loop > index 1 > WHILE"
      assert result["cardById"] == game["cardById"]
    end

    test "a timeout cannot be swallowed by functions that rescue errors" do
      code = [["WHILE", ["DEFINED", "$NOPE"], []], ["WHILE", ["NOT", ["DEFINED", "$NOPE"]], [["LOG", "x"]]]]
      result = Evaluate.evaluate_with_timeout(base_game(), code, "rescuing loop", 100)
      assert List.last(result["messages"]) =~ "Action timed out."
    end

    test "evaluate_with_timeout leaves no deadline behind" do
      Evaluate.evaluate_with_timeout(base_game(), [["LOG", "hi"]], nil, 1)
      Process.sleep(5)
      # Plain evaluation afterwards is not subject to the old deadline.
      assert ev([["LOG", "later"]])["messages"] == ["later"]
    end
  end
end
