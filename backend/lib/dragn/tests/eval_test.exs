defmodule MyTest do
  alias DragnCardsGame.{GameUI}

  def assert(test_num, evaluated, result) do
    if evaluated != result do
      raise "Failed test #{test_num}. Expected #{result} got #{evaluated}"
    else
      IO.puts("passed test #{test_num}")
    end
  end

  def evaluate(game, code) do
    #IO.inspect(code)
    if is_list(code) && Enum.count(code) > 0 do
      if is_list(Enum.at(code, 0)) do
        #actions = Enum.slice(code, 1, Enum.count(code))
        Enum.reduce(code, game, fn(action, acc) ->
          evaluate(acc, action)
        end)
      else
        # code = Enum.reduce(code, [], fn(code_line, acc) ->
        #   IO.puts("evaluating")
        #   IO.inspect(code_line)
        #   acc ++ [evaluate(game, code_line)]
        # end)

        case Enum.at(code,0) do
          "LOG_DEV" ->
            statements = Enum.slice(code, 1, Enum.count(code))
            message = Enum.reduce(statements, "", fn(statement, acc) ->
              str_statement = inspect(evaluate(game, statement))
              acc <> String.replace(str_statement,"\"","")
            end)
            IO.inspect(message)
            game
          "DEFINE" ->
            var_name = Enum.at(code, 1)
            value = evaluate(game, Enum.at(code, 2))
            put_in(game, ["variables", var_name], value)
          "LIST" ->
            list = Enum.slice(code, 1, Enum.count(code))
            Enum.reduce(list, [], fn(item,acc)->
              acc ++ [evaluate(game, item)]
            end)
          "NEXT_PLAYER" ->
            current_player_i = evaluate(game, Enum.at(code, 1))
            current_i = String.to_integer(String.slice(current_player_i, -1..-1))
            next_i = current_i + 1
            next_i = if next_i > game["numPlayers"] do 1 else next_i end
            "player" <> Integer.to_string(next_i)
          "GET_INDEX" ->
            list = evaluate(game, Enum.at(code, 1))
            value = evaluate(game, Enum.at(code, 2))
            Enum.find_index(list, fn(x) -> x == value end)
          "AT_INDEX" ->
            #raise "stop"
            list = evaluate(game, Enum.at(code, 1))
            index = evaluate(game, Enum.at(code, 2))
            if list do Enum.at(list, index) else nil end
          "LENGTH" ->
            Enum.count(evaluate(game, Enum.at(code,1)))
          "AND" ->
            statements = Enum.slice(code, 1, Enum.count(code))
            Enum.reduce_while(statements, false, fn(statement, acc) ->
              if evaluate(game, statement) == true do
                {:cont, true}
              else
                {:halt, false}
              end
            end)
          "EQUAL" ->
            evaluate(game, Enum.at(code,1)) == evaluate(game, Enum.at(code,2))
          "LESS_THAN" ->
            evaluate(game, Enum.at(code,1)) < evaluate(game, Enum.at(code,2))
          "GREATER_THAN" ->
            evaluate(game, Enum.at(code,1)) > evaluate(game, Enum.at(code,2))
          "LESS_EQUAL" ->
            evaluate(game, Enum.at(code,1)) <= evaluate(game, Enum.at(code,2))
          "GREATER_EQUAL" ->
            evaluate(game, Enum.at(code,1)) >= evaluate(game, Enum.at(code,2))
          "NOT" ->
            !evaluate(game, Enum.at(code,1))
          "JOIN_STRING" ->
            evaluate(game, Enum.at(code,1)) <> evaluate(game, Enum.at(code,2))
          "ADD" ->
            (evaluate(game, Enum.at(code,1)) || 0) + (evaluate(game, Enum.at(code,2)) || 0)
          "SUBTRACT" ->
            (evaluate(game, Enum.at(code,1)) || 0) - (evaluate(game, Enum.at(code,2)) || 0)
          "MULTIPLY" ->
            (evaluate(game, Enum.at(code,1)) || 0) * (evaluate(game, Enum.at(code,2)) || 0)
          "DIVIDE" ->
            divisor = (evaluate(game, Enum.at(code,2)) || 0)
            if divisor do (evaluate(game, Enum.at(code,1)) || 0) / divisor else nil end
          "OBJ_GET_VAL" ->
            map = evaluate(game, Enum.at(code,1))
            key = evaluate(game, Enum.at(code,2))
            map[key]
          "OBJ_GET_BY_PATH" ->
            map = evaluate(game, Enum.at(code,1))
            path = evaluate(game, Enum.at(code,2))
            get_in(map, path)
          "GAME_GET_VAL" ->
            path = evaluate(game, Enum.at(code,1))
            get_in(game, path)
          "GET_STACK_ID" ->
            group_id = evaluate(game, Enum.at(code,1))
            stack_index = evaluate(game, Enum.at(code,2))
            if group_id do evaluate(game, ["AT_INDEX", "$GAME.groupById." <> group_id <> ".stackIds", stack_index]) else nil end
          "GET_CARD_ID" ->
            group_id = evaluate(game, Enum.at(code,1))
            stack_index = evaluate(game, Enum.at(code,2))
            stack_id = evaluate(game, ["GET_STACK_ID", group_id, stack_index])
            card_index = evaluate(game, Enum.at(code,3))
            if stack_id do evaluate(game, ["AT_INDEX", "$GAME.stackById." <> stack_id <> ".cardIds", card_index]) else nil end
          "OBJ_SET_VAL" ->
            case Enum.count(code) do
              4 ->
                obj = evaluate(game, Enum.at(code,1))
                key = evaluate(game, Enum.at(code,2))
                value = evaluate(game, Enum.at(code,3))
                put_in(obj[key], value)
              5 ->
                obj = evaluate(game, Enum.at(code,1))
                path = evaluate(game, Enum.at(code,2))
                key = evaluate(game, Enum.at(code,3))
                value = evaluate(game, Enum.at(code,4))
                put_in(obj, path ++ [key], value)
            end
          "SET" ->
            path = Enum.slice(code, 1, Enum.count(code)-2)
            path = Enum.reduce(path, [], fn(path_item, acc)->
              eval_path_item = evaluate(game, path_item)
              if is_binary(eval_path_item) do
                acc ++ [eval_path_item]
              else
                acc ++ eval_path_item
              end
            end)
            value = evaluate(game, Enum.at(code, Enum.count(code)-1))
            put_in(game, path, value)
          "INCREASE_VAL" ->
            path = Enum.slice(code, 1, Enum.count(code)-2)
            path = Enum.reduce(path, [], fn(path_item, acc)->
              eval_path_item = evaluate(game, path_item)
              if is_binary(eval_path_item) do
                acc ++ [eval_path_item]
              else
                acc ++ eval_path_item
              end
            end)
            delta = evaluate(game, Enum.at(code, Enum.count(code)-1))
            old_value = get_in(game, path)
            put_in(game, path, old_value + delta)
          "DECREASE_VAL" ->
            path = Enum.slice(code, 1, Enum.count(code)-2)
            delta = evaluate(game, Enum.at(code, Enum.count(code)-1))
            evaluate(game, ["INCREASE_VAL"] ++ path ++ [-delta])
          "COND" ->
            ifthens = Enum.slice(code, 1, Enum.count(code))
            Enum.reduce_while(0..Enum.count(ifthens)-1//2, nil, fn(i, acc) ->
              if evaluate(game, Enum.at(ifthens, i)) == true do
                {:halt, evaluate(game, Enum.at(ifthens, i+1))}
              else
                {:cont, nil}
              end
            end)
            #IO.puts("COND then")
            #IO.inspect("then")
            #evaluate(game, then)
          "LOG" ->
            statements = Enum.slice(code, 1, Enum.count(code))
            message = Enum.reduce(statements, "", fn(statement, acc) ->
              str_statement = inspect(evaluate(game, statement))
              acc <> String.replace(str_statement,"\"","")
            end)
            put_in(game["messages"], game["messages"] ++ [message])
          "FOR_EACH_START_STOP_STEP" ->
            var_name = Enum.at(code, 1)
            start = evaluate(game, Enum.at(code, 2))
            stop = evaluate(game, Enum.at(code, 3))
            step = evaluate(game, Enum.at(code, 4))
            function = Enum.at(code, 5)
            Enum.reduce(start..stop-1//step, game, fn(i, acc) ->
              acc = put_in(acc, ["variables", var_name], i)
              acc = evaluate(acc, function)
            end)
          "FOR_EACH_KEY_VAL" ->
            argc = Enum.count(code) - 1
            key_name = Enum.at(code, 1)
            val_name = Enum.at(code, 2)
            old_list = evaluate(game, Enum.at(code, 3))
            #old_list = evaluate(game, ["GAME_GET_VAL", obj_path])
            function = Enum.at(code, 4)
            old_list = if argc >= 5 do
              order = if argc >= 6 and evaluate(game, Enum.at(code, 6)) == "DESC" do :desc else :asc end
              Enum.sort_by(old_list, fn({key, obj}) -> get_in(obj, evaluate(game,Enum.at(code, 5))) end, order)
            else
              old_list
            end
            Enum.reduce(old_list, game, fn({key, val}, acc) ->
              acc = put_in(acc, ["variables", key_name], key)
              acc = put_in(acc, ["variables", val_name], val)
              evaluate(acc, function)
            end)
          "FOR_EACH_VAL" ->
            argc = Enum.count(code) - 1
            val_name = Enum.at(code, 1)
            list = evaluate(game, Enum.at(code, 2))
            #old_list = evaluate(game, ["GAME_GET_VAL", obj_path])
            function = Enum.at(code, 3)
            Enum.reduce(list, game, fn(val, acc) ->
              acc = put_in(acc, ["variables", val_name], val)
              evaluate(acc, function)
            end)
          "MOVE_CARD" ->
            argc = Enum.count(code) - 1
            card_id = evaluate(game, Enum.at(code, 1))
            if card_id do
              dest_group_id = evaluate(game, Enum.at(code, 2))
              dest_stack_index = evaluate(game, Enum.at(code, 3))
              dest_card_index = evaluate(game, Enum.at(code, 4))
              options = if argc == 5 do evaluate(game, Enum.at(code, 5)) else nil end
              GameUI.move_card(game, card_id, dest_group_id, dest_stack_index, dest_card_index, options)
            else
              game
            end
          "DISCARD_CARD" ->
            card_id = evaluate(game, Enum.at(code, 1))
            card = game["cardById"][card_id]
            GameUI.move_card(game, card_id, card["discardGroupId"], 0, 0)
          "ATTACH_CARD" ->
            card_id = evaluate(game, Enum.at(code, 1))
            dest_card_id = evaluate(game, Enum.at(code, 2))
            dest_card = game["cardById"][dest_card_id]
            GameUI.move_card(game, card_id, dest_card["groupId"], dest_card["stackIndex"], -1, %{"combine" => true})
          "DRAW_CARD" ->
            argc = Enum.count(code) - 1
            num = if argc == 0 do 1 else evaluate(game, Enum.at(code, 1)) end
            player_n = if argc == 2 do evaluate(game, Enum.at(code, 2)) else game["playerUi"]["playerN"] end
            GameUI.move_stacks(game, player_n <> "Deck", player_n <> "Hand", num, "bottom")
          "MOVE_STACK" ->
            argc = Enum.count(code) - 1
            stack_id = evaluate(game, Enum.at(code, 1))
            dest_group_id = evaluate(game, Enum.at(code, 2))
            dest_stack_index = evaluate(game, Enum.at(code, 3))
            options = if argc == 4 do evaluate(game, Enum.at(code, 4)) else nil end
            GameUI.move_stack(game, stack_id, dest_group_id, dest_stack_index, options)
          "DISCARD_STACK" ->
            stack_id = evaluate(game, Enum.at(code, 1))
            stack = game["stackById"][stack_id]
            card_ids = stack["cardIds"]
            Enum.reduce(card_ids, game, fn(card_id, acc) ->
              evaluate(acc, ["DISCARD_CARD", card_id])
            end)
          "MOVE_STACKS" ->
            argc = Enum.count(code) - 1
            orig_group_id = evaluate(game, Enum.at(code, 1))
            dest_group_id = evaluate(game, Enum.at(code, 2))
            top_n = evaluate(game, Enum.at(code, 3))
            position = evaluate(game, Enum.at(code, 4))
            GameUI.move_stacks(game, orig_group_id, dest_group_id, top_n, position)
          "SHUFFLE_GROUP" ->
            group_id = evaluate(game, Enum.at(code, 1))
            stack_ids = game["groupById"][group_id]["stackIds"]
            shuffled_stack_ids = stack_ids |> Enum.shuffle
            put_in(game, ["groupById", group_id, "stack_ids"], shuffled_stack_ids)
          "FACEUP_NAME_FROM_STACK_ID" ->
            stack_id = evaluate(game, Enum.at(code, 1))
            card_id = Enum.at(game["stackById"][stack_id]["cardIds"],0)
            evaluate(game, ["FACEUP_NAME_FROM_CARD_ID", card_id])
          "FACEUP_NAME_FROM_CARD_ID" ->
            card_id = evaluate(game, Enum.at(code, 1))
            card = game["cardById"][card_id]
            face = card["sides"][card["currentSide"]]
            face["name"]
          "ACTION_LIST" ->
            action_list_id = evaluate(game, Enum.at(code, 1))
            evaluate(game, game["actionLists"][action_list_id])
          _ ->
            code
        end
      end
    else # value
      #IO.puts("parsing value #{code}")
      cond do
        code == "$PLAYER_N" ->
          game["playerUi"]["playerN"]
        code == "$GAME" ->
          game
        code == "$GAME_PATH" ->
          []
        code == "$CARD_BY_ID" ->
          game["cardById"]
        code == "$CARD_BY_ID_PATH" ->
          ["cardById"]
        code == "$PLAYER_DATA" ->
          game["playerData"]
        code == "$PLAYER_DATA_PATH" ->
          ["playerData"]
        code == "$ACTIVE_CARD_PATH" ->
          ["cardById", game["playerUi"]["activeCardId"]]
        code == "$ACTIVE_FACE_PATH" ->
          active_card = evaluate(game, "$ACTIVE_CARD")
          evaluate(game, "$ACTIVE_CARD_PATH") ++ ["sides", active_card["currentSide"]]
        code == "$ACTIVE_TOKENS_PATH" ->
          evaluate(game, "$ACTIVE_CARD_PATH") ++ ["tokens"]
        code == "$ACTIVE_CARD" ->
          get_in(game, evaluate(game, "$ACTIVE_CARD_PATH"))
        code == "$ACTIVE_FACE" ->
          get_in(game, evaluate(game, "$ACTIVE_FACE_PATH"))
        code == "$ACTIVE_TOKENS" ->
          get_in(game, evaluate(game, "$ACTIVE_TOKENS_PATH"))
        Map.has_key?(game, "variables") && Map.has_key?(game["variables"], code) ->
          game["variables"][code]
        is_binary(code) and String.starts_with?(code, "$") and String.contains?(code, ".") ->
          split = String.split(code, ".")
          obj = evaluate(game, Enum.at(split, 0))
          path = ["LIST"] ++ Enum.slice(split, 1, Enum.count(split))
          evaluate(game, ["OBJ_GET_BY_PATH", obj, path])
        true ->
          code
      end
    end
  end
end

game = %{
  "variables" => %{},
  "cardById" => %{
    "abc" => %{
      "currentSide" => "A",
      "rotation" => 0,
      "tokens" => %{
        "damage" => 1
      },
      "sides" => %{
        "A" => %{
          "name" => "testname"
        }

      }
    },
    "def" => %{
      "exhausted" => true,
      "tokens" => %{
        "damage" => 1
      }
    },
    "ghi" => %{
      "exhausted" => false,
      "tokens" => %{
        "damage" => 1
      }
    }
  },
  "playerUi" => %{
    "activeCardId" => "abc",
  },
  "playerData" => %{
    "player1" => %{"willpower" => 0},
    "player2" => %{"willpower" => 5}
  },
  "messages" => []
}

if true do
  code = "$ACTIVE_CARD_PATH"
  MyTest.assert(1, MyTest.evaluate(game, code), ["cardById", "abc"])

  code = ["SET", "$ACTIVE_CARD_PATH", "rotation", 45]
  MyTest.assert(2, MyTest.evaluate(game, code)["cardById"]["abc"]["rotation"], 45)

  code = [["SET", "$ACTIVE_CARD_PATH", "rotation", 45],["SET", "$ACTIVE_CARD_PATH", "rotation", 65]]
  MyTest.assert(3, MyTest.evaluate(game, code)["cardById"]["abc"]["rotation"], 65)

  code = ["EQUAL", ["OBJ_GET_VAL", "$ACTIVE_CARD", "rotation"], 0]
  MyTest.assert(4, MyTest.evaluate(game, code), true)

  code = ["COND", ["EQUAL", ["OBJ_GET_VAL", "$ACTIVE_CARD", "rotation"], 0], ["SET", "$ACTIVE_CARD_PATH", "rotation", 95]]
  MyTest.assert(5, MyTest.evaluate(game, code)["cardById"]["abc"]["rotation"], 95)

  code =
    [
      ["COND",
        ["EQUAL", "$ACTIVE_CARD.rotation", 0],
        [
            ["SET", "$ACTIVE_CARD_PATH", "rotation", 90],
            ["LOG","$playerN"," rotated ", "$ACTIVE_FACE.name", " 90 degrees."]
        ],
        ["EQUAL", "$ACTIVE_CARD.rotation", 90],
        [
            ["SET", "$ACTIVE_CARD_PATH", "rotation", 0],
            ["LOG","$playerN"," rotated ", "$ACTIVE_FACE.name", " -90 degrees."]
        ]
      ],
      ["COND",
        ["EQUAL", "$ACTIVE_CARD.rotation", 0],
        [
            ["SET", "$ACTIVE_CARD_PATH", "rotation", 90],
            ["LOG","$playerN"," rotated ", "$ACTIVE_FACE.name", " 90 degrees."]
        ],
        ["EQUAL", "$ACTIVE_CARD.rotation", 90],
        [
            ["SET", "$ACTIVE_CARD_PATH", "rotation", -10],
            ["LOG","$playerN"," rotated ", "$ACTIVE_FACE.name", " -90 degrees."]
        ]
      ]
    ]
  MyTest.assert(6, MyTest.evaluate(game, code)["cardById"]["abc"]["rotation"], -10)

  code = ["OBJ_SET_VAL", "$ACTIVE_CARD", "rotation", 44]
  MyTest.assert(7, MyTest.evaluate(game, code)["rotation"], 44)

  code = ["FOR_EACH_KEY_VAL", "$CARD_ID", "$CARD", "$CARD_BY_ID", ["SET", "$CARD_BY_ID_PATH", "$CARD_ID", ["OBJ_SET_VAL", "$CARD", "rotation", 77]]]
  MyTest.assert(8, MyTest.evaluate(game, code)["cardById"]["ghi"]["rotation"], 77)

  code = ["FOR_EACH_KEY_VAL", "$CARD_ID", "$CARD", "$CARD_BY_ID", ["SET", ["LIST", "cardById", "$CARD_ID", "rotation"], 77]]
  MyTest.assert(8, MyTest.evaluate(game, code)["cardById"]["ghi"]["rotation"], 77)

  code =
    ["FOR_EACH_KEY_VAL", "$CARD_ID", "$CARD", "$CARD_BY_ID",
      ["COND",
        ["EQUAL", "$CARD.exhausted", true],
        ["SET", ["LIST", "cardById", "$CARD_ID", "rotation"], 77],
        true,
        "$GAME"
      ]
    ]
  MyTest.assert(9, MyTest.evaluate(game, code)["cardById"]["def"]["rotation"], 77)

  code =
    ["FOR_EACH_KEY_VAL", "$PLAYER_I", "$PLAYER_I_DATA", "$GAME.playerData",
      ["COND",
        ["EQUAL", "$PLAYER_I_DATA.willpower", 0],
        ["SET", "playerData", "$PLAYER_I", "willpower", 22],
        true,
        "$GAME",
      ]
    ]
  MyTest.assert(10, MyTest.evaluate(game, code)["playerData"]["player1"]["willpower"], 22)
end

alias DragnCardsGame.GameUI
game_def = "./../frontend/src/features/plugins/lotrlcg/definitions/gameDefinition.json" |> File.read! |> Poison.decode!
gameui = GameUI.new("test", %{:id => 1}, %{"pluginUuid" => "3280e40f-8e25-451d-91ec-06283285a0ad", "pluginVersion" => 1})
#IO.inspect(gameui)
cards = game_def["preBuiltDecks"]["Q01.1"]["cards"]

load_list = [
  %{
    "loadGroupId" => "player1Deck",
    "quantity" => 1,
    "uuid" => "myuuid",
    "cardDetails" => %{
      "A" => %{
        "attack" => "",
        "cardBack" => "encounter",
        "cost" => "",
        "deckbuilderQuantity" => 1,
        "defense" => "",
        "encounterSet" => "Dol Guldur Orcs",
        "engagementCost" => "",
        "hitPoints" => "",
        "imageUrl" => "https://dragncards-lotrlcg.s3.amazonaws.com/cards/English/51223bd0-ffd1-11df-a976-0801200c9092.jpg",
        "keywords" => "",
        "name" => "Driven by Shadow",
        "numberInPack" => 92,
        "packName" => "Core Set",
        "questPoints" => "",
        "setUuid" => "51223bd0-ffd1-11df-a976-0801200c9000",
        "shadow\r" => "Shadow: Choose and discard 1 attachment from the defending character. (If this attack is undefended, discard all attachments you control.)\r",
        "sphere" => "",
        "text" => "When Revealed: Each enemy and each location currently in the staging area gets +1 [threat] until the end of the phase. If there are no cards in the staging area, Driven by Shadow gains surge.",
        "threat" => "",
        "traits" => "",
        "type" => "Treachery",
        "unique" => "",
        "uuid" => "51223bd0-ffd1-11df-a976-0801200c9092",
        "victoryPoints" => "",
        "willpower" => ""
      },
      "B" => %{
        "attack" => nil,
        "cardBack" => nil,
        "cost" => nil,
        "deckbuilderQuantity" => nil,
        "defense" => nil,
        "encounterSet" => nil,
        "engagementCost" => nil,
        "hitPoints" => nil,
        "imageUrl" => nil,
        "keywords" => nil,
        "name" => "encounter",
        "numberInPack" => nil,
        "packName" => nil,
        "questPoints" => nil,
        "setUuid" => nil,
        "shadow\r" => nil,
        "sphere" => nil,
        "text" => nil,
        "threat" => nil,
        "traits" => nil,
        "type" => nil,
        "unique" => nil,
        "uuid" => nil,
        "victoryPoints" => nil,
        "willpower" => nil
      }
    }
  },
  %{
    "loadGroupId" => "sharedEncounterDeck",
    "quantity" => 3,
    "uuid" => "51223bd0-ffd1-11df-a976-0801200c9093",
    "cardDetails" => %{
      "A" => %{
        "attack" => "",
        "cardBack" => "encounter",
        "cost" => "",
        "deckbuilderQuantity" => 3,
        "defense" => "",
        "encounterSet" => "Dol Guldur Orcs",
        "engagementCost" => "",
        "hitPoints" => "",
        "imageUrl" => "https://dragncards-lotrlcg.s3.amazonaws.com/cards/English/51223bd0-ffd1-11df-a976-0801200c9093.jpg",
        "keywords" => "",
        "name" => "The Necromancer's Reach",
        "numberInPack" => 93,
        "packName" => "Core Set",
        "questPoints" => "",
        "setUuid" => "51223bd0-ffd1-11df-a976-0801200c9000",
        "shadow\r" => "\r",
        "sphere" => "",
        "text" => "When Revealed: Deal 1 damage to each exhausted character.",
        "threat" => "",
        "traits" => "",
        "type" => "Treachery",
        "unique" => "",
        "uuid" => "51223bd0-ffd1-11df-a976-0801200c9093",
        "victoryPoints" => "",
        "willpower" => ""
      },
      "B" => %{
        "attack" => nil,
        "cardBack" => nil,
        "cost" => nil,
        "deckbuilderQuantity" => nil,
        "defense" => nil,
        "encounterSet" => nil,
        "engagementCost" => nil,
        "hitPoints" => nil,
        "imageUrl" => nil,
        "keywords" => nil,
        "name" => "encounter",
        "numberInPack" => nil,
        "packName" => nil,
        "questPoints" => nil,
        "setUuid" => nil,
        "shadow\r" => nil,
        "sphere" => nil,
        "text" => nil,
        "threat" => nil,
        "traits" => nil,
        "type" => nil,
        "unique" => nil,
        "uuid" => nil,
        "victoryPoints" => nil,
        "willpower" => nil
      }
    }
  },
  %{
    "loadGroupId" => "sharedEncounterDeck",
    "quantity" => 1,
    "uuid" => "51223bd0-ffd1-11df-a976-0801200c9099",
    "cardDetails" => %{
      "A" => %{
        "attack" => "",
        "cardBack" => "encounter",
        "cost" => "",
        "deckbuilderQuantity" => 2,
        "defense" => "",
        "encounterSet" => "Passage Through Mirkwood",
        "engagementCost" => "",
        "hitPoints" => "",
        "imageUrl" => "https://dragncards-lotrlcg.s3.amazonaws.com/cards/English/51223bd0-ffd1-11df-a976-0801200c9099.jpg",
        "keywords" => "",
        "name" => "Old Forest Road",
        "numberInPack" => 99,
        "packName" => "Core Set",
        "questPoints" => 3,
        "setUuid" => "51223bd0-ffd1-11df-a976-0801200c9000",
        "shadow\r" => "\r",
        "sphere" => "",
        "text" => "Response: After you travel to Old Forest Road, the first player may choose and ready 1 character he controls.",
        "threat" => 1,
        "traits" => "Forest.",
        "type" => "Location",
        "unique" => "",
        "uuid" => "51223bd0-ffd1-11df-a976-0801200c9099",
        "victoryPoints" => "",
        "willpower" => ""
      },
      "B" => %{
        "attack" => nil,
        "cardBack" => nil,
        "cost" => nil,
        "deckbuilderQuantity" => nil,
        "defense" => nil,
        "encounterSet" => nil,
        "engagementCost" => nil,
        "hitPoints" => nil,
        "imageUrl" => nil,
        "keywords" => nil,
        "name" => "encounter",
        "numberInPack" => nil,
        "packName" => nil,
        "questPoints" => nil,
        "setUuid" => nil,
        "shadow\r" => nil,
        "sphere" => nil,
        "text" => nil,
        "threat" => nil,
        "traits" => nil,
        "type" => nil,
        "unique" => nil,
        "uuid" => nil,
        "victoryPoints" => nil,
        "willpower" => nil
      }
    }
  },
  %{
    "loadGroupId" => "sharedEncounterDeck",
    "quantity" => 1,
    "uuid" => "51223bd0-ffd1-11df-a976-0801200c9096",
    "cardDetails" => %{
      "A" => %{
        "attack" => 2,
        "cardBack" => "encounter",
        "cost" => "",
        "deckbuilderQuantity" => 4,
        "defense" => 1,
        "encounterSet" => "Passage Through Mirkwood",
        "engagementCost" => 25,
        "hitPoints" => 4,
        "imageUrl" => "https://dragncards-lotrlcg.s3.amazonaws.com/cards/English/51223bd0-ffd1-11df-a976-0801200c9096.jpg",
        "keywords" => "",
        "name" => "Forest Spider",
        "numberInPack" => 96,
        "packName" => "Core Set",
        "questPoints" => "",
        "setUuid" => "51223bd0-ffd1-11df-a976-0801200c9000",
        "shadow\r" => "Shadow: Defending player must choose and discard 1 attachment he controls.\r",
        "sphere" => "",
        "text" => "Forced: After Forest Spider engages a player, it gets +1 [attack] until the end of the round.",
        "threat" => 2,
        "traits" => "Creature. Spider.",
        "type" => "Enemy",
        "unique" => "",
        "uuid" => "51223bd0-ffd1-11df-a976-0801200c9096",
        "victoryPoints" => "",
        "willpower" => ""
      },
      "B" => %{
        "attack" => nil,
        "cardBack" => nil,
        "cost" => nil,
        "deckbuilderQuantity" => nil,
        "defense" => nil,
        "encounterSet" => nil,
        "engagementCost" => nil,
        "hitPoints" => nil,
        "imageUrl" => nil,
        "keywords" => nil,
        "name" => "encounter",
        "numberInPack" => nil,
        "packName" => nil,
        "questPoints" => nil,
        "setUuid" => nil,
        "shadow\r" => nil,
        "sphere" => nil,
        "text" => nil,
        "threat" => nil,
        "traits" => nil,
        "type" => nil,
        "unique" => nil,
        "uuid" => nil,
        "victoryPoints" => nil,
        "willpower" => nil
      }
    }
  },
  %{
    "loadGroupId" => "player1Engaged",
    "quantity" => 1,
    "uuid" => "51223bd0-ffd1-11df-a976-0801200c9096",
    "cardDetails" => %{
      "A" => %{
        "engagementCost" => 25,
        "name" => "Forest Spider 1",
        "type" => "Enemy",
      },
      "B" => %{
        "name" => "encounter",
      }
    }
  },
  %{
    "loadGroupId" => "player1Engaged",
    "quantity" => 1,
    "uuid" => "51223bd0-ffd1-11df-a976-0801200c9096",
    "cardDetails" => %{
      "A" => %{
        "engagementCost" => 30,
        "name" => "Forest Spider 2",
        "type" => "Enemy",
      },
      "B" => %{
        "name" => "encounter",
      }
    }
  },
  %{
    "loadGroupId" => "player1Engaged",
    "quantity" => 1,
    "uuid" => "51223bd0-ffd1-11df-a976-0801200c9096",
    "cardDetails" => %{
      "A" => %{
        "engagementCost" => 35,
        "name" => "Forest Spider 3",
        "type" => "Enemy",
      },
      "B" => %{
        "name" => "encounter",
      }
    }
  }
]

gameui = GameUI.game_action(gameui, 1, "load_cards", %{"load_list" => load_list})
game = gameui["game"]
game = put_in(game, ["variables", "$i"], 1)
game = put_in(game, ["playerData", "player1", "cardsDrawn"], 2)
game = put_in(game["playerUi"], %{"playerN" => "player1"})
game = put_in(game["numPlayers"], 3)

stack_id = Enum.at(game["groupById"]["sharedEncounterDeck"]["stackIds"],0)
card_id = Enum.at(game["stackById"][stack_id]["cardIds"],0)

code = ["MOVE_CARD", card_id, "sharedVictory", 0, 0]
MyTest.assert(11, MyTest.evaluate(game, code)["cardById"][card_id]["groupId"], "sharedVictory")

code = ["FOR_EACH_START_STOP_STEP", "$i", 1, 30, 2, ["LOG", "$i"]]
MyTest.assert(12, MyTest.evaluate(game, code)["variables"]["$i"], 29)

code = ["FOR_EACH_START_STOP_STEP", "$i", 0, 10, 1, ["MOVE_CARD", ["GET_CARD_ID", "sharedEncounterDeck", 0, 0], "sharedVictory", 0, 0]]
MyTest.assert(13, Enum.count(MyTest.evaluate(game, code)["groupById"]["sharedVictory"]["stackIds"]), 5)

code = ["NEXT_PLAYER", ["NEXT_PLAYER", ["NEXT_PLAYER", "$GAME.firstPlayer"]]]
MyTest.assert(14, MyTest.evaluate(game, code), "player1")


actions = %{
  "newRound" => [
    ["COND",
      ["EQUAL", "$GAME.playerData.$PLAYER_N.refreshed", false],
      ["ACTION_LIST", "refresh"],
      true,
      "$GAME"
    ],
    ["COND",
      ["EQUAL", "$GAME.playerUi.playerN", "player1"],
      [
        ["INCREASE_VAL", "roundNumber", 1],
        ["LOG", "player1 increased the round."],
        ["SET", "phaseId", "Resource"],
        ["LOG", "player1 set the phase to Resource."],
        ["SET", "stepId", "1.R"],
        ["LOG", "player1 set the round step to 1.R."]
      ],
      true,
      "$GAME"
    ],
    ["FOR_EACH_KEY_VAL", "$CARD_ID", "$CARD", "$CARD_BY_ID", [
      ["DEFINE", "$CURRENT_SIDE", "$CARD.currentSide"],
      ["COND",
        ["AND",
          ["EQUAL", "$CARD.sides.$CURRENT_SIDE.type", "Hero"],
          ["EQUAL", "$CARD.controller", "playerN"],
          ["EQUAL", "$CARD.inPlay", true],
        ],
        [
          ["INCREASE_VAL", "cardById", "$CARD_ID", "tokens", "resource", 1],
          ["LOG", "$ALIAS_N", " added 1 resource token to ", ["OBJ_GET_VAL", "$CARD", "sides", ["OBJ_GET_VAL", "$CARD", "currentSide"], "name"], "."],
        ],
        true,
        "$GAME"
      ],
      ["COND",
        ["EQUAL", "$CARD.controller", "playerN"],
        ["SET", "cardById", "$CARD_ID", "committed", false],
        true,
        "$GAME"
      ],
      ["COND",
        ["AND",
          ["EQUAL", "$CARD.controller", "playerN"],
          ["EQUAL", "$CARD.inPlay", true],
        ],
        [
          ["SET", "cardById", "$CARD_ID", "tokens", "resource", 1], #["OBJ_GET_VAL", "$CARD", "extraResources"]],
          ["LOG", "$ALIAS_N", " added ", ["OBJ_GET_VAL", "$CARD", "extraResources"]," extra resource token(s) to ", ["OBJ_GET_VAL", "$CARD", "sides", ["OBJ_GET_VAL", "$CARD", "currentSide"], "type"]]
        ],
        true,
        "$GAME"
      ],
    ]],
    ["FOR_EACH_START_STOP_STEP", "$i", 0, "$GAME.playerData.player1.cardsDrawn", 1,
      [
        ["MOVE_CARD", ["GET_CARD_ID", ["JOIN_STRING", "$PLAYER_N", "Deck"], 0, 0], ["JOIN_STRING", "$PLAYER_N", "Hand"], 0, 0],
        ["LOG", "$ALIAS_N", " drew 1 card."]
      ]
    ],
    ["SET", "playerData", "$PLAYER_N", "willpower", 0],
    ["SET", "playerData", "$PLAYER_N", "refreshed", false],
  ],
  "refresh" => [
    ["COND",
      ["EQUAL", "$GAME.playerUi.playerN", "player1"],
      [
        ["SET", "phaseId", "Refresh"],
        ["SET", "stepId", "7.R"],
        ["SET", "firstPlayer", ["NEXT_PLAYER", "$GAME.firstPlayer"]],
        ["LOG", "player1 set the phase to Refresh."],
        ["LOG", "player1 set the round step to 7.R."]
      ],
      true,
      "$GAME"
    ],
    ["FOR_EACH_KEY_VAL", "$CARD_ID", "$CARD", "$CARD_BY_ID", [
      ["COND",
        ["AND",
          ["EQUAL", "$CARD.controller", "playerN"],
          ["EQUAL", "$CARD.inPlay", true],
        ],
        [
          ["SET", "cardById", "$CARD_ID", "rotation", 0],
          ["SET", "cardById", "$CARD_ID", "exhausted", false]
        ],
        true,
        "$GAME"
      ],
    ]],
    ["SET", "playerData", "$PLAYER_N", "refreshed", true],
    ["LOG", "player1 refeshed."]
  ],
  "revealEncounterFaceup" => [
    ["DEFINE", "$REVEAL_FACEDOWN", false],
    ["ACTION_LIST", "revealEncounter"],
  ],
  "revealEncounterFacedown" => [
    ["DEFINE", "$REVEAL_FACEDOWN", false],
    ["ACTION_LIST", "revealEncounter"],
  ],
  "revealSecondaryFaceup" => [
    ["DEFINE", "$REVEAL_FACEDOWN", false],
    ["ACTION_LIST", "revealSecondary"],
  ],
  "revealSecondaryFacedown" => [
    ["DEFINE", "$REVEAL_FACEDOWN", false],
    ["ACTION_LIST", "revealSecondary"],
  ],
  "revealEncounter" => [
    ["COND",
      ["EQUAL", ["LENGTH", "$GAME.groupById.sharedEncounterDeck.stackIds"], 0],
      ["COND",
        ["EQUAL", "$GAME.phaseId", "Quest"],
        [
          ["MOVE_STACKS", "sharedEncounterDiscard", "sharedEncounterDeck", ["LENGTH", "$GAME.groupById.sharedEncounterDiscard.stackIds"], "shuffle"],
          ["LOG", "$ALIAS_N"," shuffled the encounter discard pile into the encounter deck."]
        ],
        true,
        ["LOG", "$ALIAS_N", "tried to reveal a card, but the encounter deck is empty and it's not the quest phase."]
      ],
      true,
      [
        ["DEFINE", "$STACK_ID", ["AT_INDEX", "$GAME.groupById.sharedEncounterDeck.stackIds", 0]],
        ["MOVE_STACK", "$STACK_ID", "sharedStaging", -1, false, "$REVEAL_FACEDOWN"],
        ["LOG", "$ALIAS_N", " revealed ", ["FACEUP_NAME_FROM_STACK_ID", "$STACK_ID"]]
      ]
    ],
    ["COND",
      ["EQUAL", ["LENGTH", "$GAME.groupById.sharedEncounterDeck.stackIds"], 0],
      [
        ["MOVE_STACKS", "sharedEncounterDiscard", "sharedEncounterDeck", ["LENGTH", "$GAME.groupById.sharedEncounterDiscard.stackIds"], "shuffle"],
        ["LOG", "$ALIAS_N"," shuffled the encounter discard pile into the encounter deck."]
      ],
      true,
      "$GAME"
    ]
  ],
  "revealSecondary" => [
    ["COND",
      ["EQUAL", ["LENGTH", "$GAME.groupById.sharedEncounterDeck2.stackIds"], 0],
      ["LOG", "$ALIAS_N", " tried to reveal a card from the second encounter deck, but it's empty."],
      true,
      [
        ["DEFINE", "$STACK_ID", ["AT_INDEX", "$GAME.groupById.sharedEncounterDeck2.stackIds", 0]],
        ["MOVE_STACK", "$STACK_ID", "sharedStaging", -1, false, "$REVEAL_FACEDOWN"],
        ["LOG", "$ALIAS_N", " revealed ", ["FACEUP_NAME_FROM_STACK_ID", "$STACK_ID"]]
      ]
    ]
  ],
  "draw" => [
    ["MOVE_CARD", ["GET_CARD_ID", ["JOIN_STRING", "$PLAYER_N", "Deck"], 0, 0], ["JOIN_STRING", "$PLAYER_N", "Hand"], 0, 0],
  ],
  "shadows" => [
    ["DEFINE", "$STEP_ID", "6.2"],
    ["COND",
      ["AND", ["EQUAL", "$GAME.playerUi.playerN", "player1"], ["NOT_EQUAL", "$STEP_ID", "$GAME.stepId"]],
      [
        ["SET", "stepId", "$STEP_ID"],
        ["LOG", "$ALIAS_N", " set the round step to ", "$GAME.gameDef.steps.$STEP_ID.text", "."]
      ],
      true,
      "$GAME"
    ],
    ["FOR_EACH_KEY_VAL", "$PLAYER_I", "$PLAYER_I_DATA", "$GAME.playerData",
      [
        ["FOR_EACH_KEY_VAL", "$CARD_ID", "$CARD", "$CARD_BY_ID",
          [
            ["COND",
              ["AND",
                ["EQUAL", "$CARD.groupId", ["JOIN_STRING", "$PLAYER_I", "Engaged"]],
                ["EQUAL", "$CARD.cardIndex", 0],
                ["EQUAL", "$CARD.sides.A.type", "Enemy"],
              ],
              ["COND",
                ["EQUAL", ["LENGTH", "$GAME.groupById.sharedEncounterDeck.stackIds"], 0],
                [
                  ["LOG", "$ALIAS_N", " tried to deal a shadow card but the encounter deck is empty."],
                  ["LOG_DEV", "tried to deal shadow but couldn't"],
                ],
                true,
                [
                  ["DEFINE", "$SHADOW_CARD_ID", ["GET_CARD_ID", "sharedEncounterDeck", 0, 0]],
                  ["ATTACH_CARD", "$SHADOW_CARD_ID", "$CARD_ID"],
                  ["SET", "cardById", "$SHADOW_CARD_ID", "rotation", -30],
                  ["SET", "cardById", "$SHADOW_CARD_ID", "currentSide", "B"],
                  ["LOG", "$ALIAS_N", " dealt a shadow card to ", ["FACEUP_NAME_FROM_CARD_ID", "$CARD_ID"], "."]
                ]
              ],
              true,
              "$GAME"
            ]
          ],
          ["sides", "A", "engagementCost"],
          "DESC"
        ]
      ],
      ["currentPosition"]
    ]
  ],
  "discard_shadows" => [
    ["FOR_EACH_KEY_VAL", "$CARD_ID", "$CARD", "$CARD_BY_ID",
      [
        ["COND",
          ["EQUAL", "$CARD.rotation", -30],
          ["DISCARD_CARD", "$CARD_ID"],
          true,
          "$GAME"
        ]
      ]
    ]
  ],
  "next_step" => [
    ["COND",
      ["EQUAL", "$GAME.stepId", ["AT_INDEX", "$GAME.gameDef.stepOrder", -1]],
      ["SET", "stepId", ["AT_INDEX", "$GAME.gameDef.stepOrder", 0]],
      true,
      [["LOG_DEV", "here"],
      ["SET", "stepId", ["AT_INDEX", "$GAME.gameDef.stepOrder", ["ADD", ["GET_INDEX", "$GAME.gameDef.stepOrder", "$GAME.stepId"], 1]]]
      ]
    ],
    ["DEFINE", "$STEP_ID", "$GAME.stepId"],
    ["DEFINE", "$STEP", "$GAME.gameDef.steps.$STEP_ID"],
    ["LOG", "$ALIAS_N", " set the round step to ", "$STEP.text", "."]
  ],
  "prev_step" => [
    ["COND",
      ["EQUAL", "$GAME.stepId", ["AT_INDEX", "$GAME.gameDef.stepOrder", 0]],
      ["SET", "stepId", ["AT_INDEX", "$GAME.gameDef.stepOrder", -1]],
      true,
      [["LOG_DEV", "here"],
      ["SET", "stepId", ["AT_INDEX", "$GAME.gameDef.stepOrder", ["SUBTRACT", ["GET_INDEX", "$GAME.gameDef.stepOrder", "$GAME.stepId"], 1]]]
      ]
    ],
    ["DEFINE", "$STEP_ID", "$GAME.stepId"],
    ["DEFINE", "$STEP", "$GAME.gameDef.steps.$STEP_ID"],
    ["LOG", "$ALIAS_N", " set the round step to ", "$STEP.text", "."]
  ],
  "mulligan" => [
    ["DEFINE", "$HAND_GROUP_ID", ["JOIN_STRING", "$PLAYER_N", "Hand"]],
    ["DEFINE", "$DECK_GROUP_ID", ["JOIN_STRING", "$PLAYER_N", "Deck"]],
    ["DEFINE", "$HAND_SIZE", ["LENGTH", "$GAME.groupById.$HAND_GROUP_ID.stackIds"]],
    ["MOVE_STACKS", "$HAND_GROUP_ID", "$DECK_GROUP_ID", "$HAND_SIZE", "shuffle"],
    ["DRAW", "$HAND_SIZE"]
  ],
  "clear_targets" => [
    ["SET", "playerData", "$PLAYER_N", "arrows", %{}],
    ["SET", "playerData", "$PLAYER_N", "targeting", %{}],
    ["LOG", "PLAYER_N", " cleared their targets."]
  ],
  "increase_threat" => [
    ["INCREASE_VAL", "playerData", "$PLAYER_N", "threat", 1],
    ["LOG", "PLAYER_N", " increased their threat by 1."]
  ],
  "increase_threat_all" => [
    ["FOR_EACH_KEY_VAL", "$PLAYER_I", "$PLAYER_I_DATA", "$GAME.playerData",
      ["INCREASE_VAL", "playerData", "$PLAYER_I", "threat", 1]
    ],
    ["LOG", "PLAYER_N", " increased each player's threat by 1."]
  ],
  "decrease_threat" => [
    ["INCREASE_VAL", "playerData", "$PLAYER_N", "threat", -1],
    ["LOG", "PLAYER_N", " decreased their threat by 1."]
  ],
  "decrease_threat_all" => [
    ["FOR_EACH_KEY_VAL", "$PLAYER_I", "$PLAYER_I_DATA", "$GAME.playerData",
      ["INCREASE_VAL", "playerData", "$PLAYER_I", "threat", -1]
    ],
    ["LOG", "PLAYER_N", " increased each player's threat by 1."]
  ],
  "draw_next_seat" => [
    ["DRAW", 1, ["NEXT_PLAYER", "$PLAYER_N"]],
    ["LOG", "PLAYER_N", " drew 1 card."]
  ],
  "zero_tokens" => [
    ["SET", "$ACTIVE_TOKENS_PATH", %{}],
    ["LOG", "PLAYER_N", " removed all tokens from ", "$ACTIVE_FACE.name", "."]
  ],
  "toggle_exhaust" => [
    ["COND",
      ["AND", ["EQUAL", "$ACTIVE_CARD.rotation", 90], "$CARD.inPlay"],
      [
        ["SET", "$ACTIVE_CARD_PATH", "rotation", 0],
        ["SET", "$ACTIVE_CARD_PATH", "exhausted", false],
        ["SET", "PLAYER_N", " readied ", "$ACTIVE_FACE.name", "."]
      ],
      ["AND", ["EQUAL", "$ACTIVE_CARD.rotation", 0], "$CARD.inPlay"],
      [
        ["SET", "$ACTIVE_CARD_PATH", "rotation", 90],
        ["SET", "$ACTIVE_CARD_PATH", "exhausted", true],
        ["SET", "PLAYER_N", " exhausted ", "$ACTIVE_FACE.name", "."]
      ],
      true,
      "$GAME"
    ]
  ],
  "flip" => [
    ["COND",
      ["EQUAL", "$ACTIVE_CARD.currentSide", "A"],
      [
        ["SET", "PLAYER_N", " flipped ", "$ACTIVE_FACE.name", " facedown."],
        ["SET", "$ACTIVE_CARD_PATH", "rotation", 0],
        ["SET", "$ACTIVE_CARD_PATH", "exhausted", false],
      ],
      true,
      [
        ["SET", "$ACTIVE_CARD_PATH", "rotation", 90],
        ["SET", "$ACTIVE_CARD_PATH", "exhausted", true],
        ["SET", "PLAYER_N", " flipped ", "$ACTIVE_FACE.name", " faceup."],
      ]
    ]
  ],
  "toggle_commit" => [
    ["DEFINE", "$STEP_ID", "3.2"],
    ["COND",
      ["AND", ["EQUAL", "$GAME.playerUi.playerN", "player1"], ["NOT_EQUAL", "$STEP_ID", "$GAME.stepId"]],
      [
        ["SET", "stepId", "$STEP_ID"],
        ["LOG", "$ALIAS_N", " set the round step to ", "$GAME.gameDef.steps.$STEP_ID.text", "."]
      ],
      true,
      "$GAME"
    ],
    ["COND",
      ["AND", ["EQUAL", "$ACTIVE_CARD.rotation", 0], ["EQUAL", "$ACTIVE_CARD.committed", false], "$CARD.inPlay"],
      [
        ["SET", "$ACTIVE_CARD_PATH", "rotation", 90],
        ["SET", "$ACTIVE_CARD_PATH", "exhausted", true],
        ["INCREASE_VAL", "playerData", "$ACTIVE_CARD.controller", "willpower", "$ACTIVE_FACE.willpower"],
        ["SET", "PLAYER_N", " committed ", "$ACTIVE_FACE.name", "to the quest."]
      ],
      ["AND", ["EQUAL", "$ACTIVE_CARD.committed", true], "$CARD.inPlay"],
      [
        ["SET", "$ACTIVE_CARD_PATH", "rotation", 0],
        ["SET", "$ACTIVE_CARD_PATH", "exhausted", false],
        ["DECREASE_VAL", "playerData", "$ACTIVE_CARD.controller", "willpower", "$ACTIVE_FACE.willpower"],
        ["SET", "PLAYER_N", " uncommitted ", "$ACTIVE_FACE.name", "to the quest."]
      ],
      true,
      "$GAME"
    ]
  ],
  "toggle_commit_without_exhausting" => [
    ["DEFINE", "$STEP_ID", "3.2"],
    ["COND",
      ["AND", ["EQUAL", "$GAME.playerUi.playerN", "player1"], ["NOT_EQUAL", "$STEP_ID", "$GAME.stepId"]],
      [
        ["SET", "stepId", "$STEP_ID"],
        ["LOG", "$ALIAS_N", " set the round step to ", "$GAME.gameDef.steps.$STEP_ID.text", "."]
      ],
      true,
      "$GAME"
    ],
    ["COND",
      ["AND", ["EQUAL", "$ACTIVE_CARD.rotation", 0], ["EQUAL", "$ACTIVE_CARD.committed", false], "$CARD.inPlay"],
      [
        ["INCREASE_VAL", "playerData", "$ACTIVE_CARD.controller", "willpower", "$ACTIVE_FACE.willpower"],
        ["SET", "PLAYER_N", " committed ", "$ACTIVE_FACE.name", "to the quest without exhausting."]
      ],
      ["AND", ["EQUAL", "$ACTIVE_CARD.committed", true], "$CARD.inPlay"],
      [
        ["DECREASE_VAL", "playerData", "$ACTIVE_CARD.controller", "willpower", "$ACTIVE_FACE.willpower"],
        ["SET", "PLAYER_N", " removed ", "$ACTIVE_FACE.name", "from the quest."]
      ],
      true,
      "$GAME"
    ]
  ],
  "deal_shadow" => [
    ["COND",
      "$CARD.inPlay",
      ["COND",
        ["EQUAL", ["LENGTH", "$GAME.groupById.sharedEncounterDeck.stackIds"], 0],
        ["LOG", "$ALIAS_N", " tried to deal a shadow card but the encounter deck is empty."],
        true,
        [
          ["DEFINE", "$SHADOW_CARD_ID", ["GET_CARD_ID", "sharedEncounterDeck", 0, 0]],
          ["ATTACH_CARD", "$SHADOW_CARD_ID", "$ACTIVE_CARD_ID"],
          ["SET", "cardById", "$SHADOW_CARD_ID", "rotation", -30],
          ["SET", "cardById", "$SHADOW_CARD_ID", "currentSide", "B"],
          ["LOG", "$ALIAS_N", " dealt a shadow card to ", "$ACTIVE_FACE.name", "."]
        ]
      ],
      true,
      "$GAME"
    ]
  ],
  "target_card" => [
    ["SET", "playerData", "targeting", "$PLAYER_N", "$ACTIVE_CARD_ID", true],
    ["LOG", "$ALIAS_N", " targeted ", "$ACTIVE_FACE.name", "."]
  ],
  "victory" => [
    ["MOVE_CARD", "$ACTIVE_CARD_ID", "sharedVictory", 0, 0]
  ],
  "discard" => [
    ["COND",
      ["EQUAL", "$ACTIVE_CARD.cardIndex", 0],
      [
        ["DEFINE", "$STACK_ID", "$ACTIVE_CARD.stackId"],
        ["DEFINE", "$CARD_IDS", "$GAME.stackById.$STACK_ID.cardIds"],
        ["FOR_EACH_VAL", "$CARD_ID", "$CARD_IDS",
          [
            ["DEFINE", "$CARD", "$GAME.cardById.$CARD_ID"],
            ["DEFINE", "$CURRENT_SIDE", "$CARD.currentSide"],
            ["LOG", "$ALIAS_N", " discarded ", "$CARD.sides.$CURRENT_SIDE.name", "."],
            ["DISCARD", "$CARD_ID"],
          ]
        ]
      ],
      true,
      [
        ["DEFINE", "$CURRENT_SIDE", "$ACTIVE_CARD.currentSide"],
        ["LOG", "$ALIAS_N", " discarded ", "$ACTIVE_CARD.sides.$CURRENT_SIDE.name", "."],
        ["DISCARD_CARD", "$ACTIVE_CARD_ID"],
      ]
    ]
  ],
  "shuffle_into_deck" => [
    ["MOVE_CARD", "$ACTIVE_CARD_ID", "$ACTIVE_CARD.deckGroupId", 0, 0],
    ["DEFINE", "$GROUP_ID", "$ACTIVE_CARD.deckGroupId"],
    ["SHUFFLE_GROUP", "$GROUP_ID"],
    ["LOG", "$ALIAS_N", " shuffled ", "$GAME.groupById.$GROUP_ID.name", "."]
  ],
  "detach" => [
    ["COND",
      ["GREATER_THAN", "$ACTIVE_CARD.cardIndex", 0],
      [
        ["MOVE_CARD", "$ACTIVE_CARD_ID", "$ACTIVE_CARD.groupId", ["ADD", "$ACTIVE_CARD.stackIndex", 1], 0],
        ["LOG", "$ALIAS_N", " detached ", "$ACTIVE_FACE.name", "."]
      ],
      true,
      "$GAME"
    ]
  ],
  "swap_side" => [
    ["COND",
      ["GREATER_THAN", "$ACTIVE_CARD.cardIndex", 0],
      ["COND",
        ["EQUAL", "$ACTIVE_CARD.attachmentDirection", -1],
        ["SET", "cardById", "$ACTIVE_CARD_ID", "attachmentDirection", 1],
        true,
        ["SET", "cardById", "$ACTIVE_CARD_ID", "attachmentDirection", -1],
      ],
      true,
      "$GAME"
    ]
  ],
  "move_to_back" => [
    ["MOVE_CARD", "$ACTIVE_CARD_ID", "$ACTIVE_CARD.groupId", "$ACTIVE_CARD.stackIndex", -1, true]
  ]

}

game = put_in(game["actionLists"], actions)

MyTest.assert(15, MyTest.evaluate(game, actions["newRound"])["stepId"], "1.R")
MyTest.assert(16, MyTest.evaluate(game, actions["refresh"])["stepId"], "7.R")
MyTest.assert(17, MyTest.evaluate(game, actions["next_step"])["stepId"], "1.1")
MyTest.assert(18, MyTest.evaluate(game, actions["prev_step"])["stepId"], "0.1")
