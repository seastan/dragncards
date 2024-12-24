defmodule DragnCardsGame.Evaluate.Functions.COND do
  alias DragnCardsGame.{Evaluate, StringifyVar}
  @moduledoc """
  *Arguments*:
  Any number of pairs of booleans and DragnLang code blocks

  *Returns*:
  (any) The result of the DragnLang code block after the first true boolean. If no boolean is true, returns the game state.

  *Example*:
  ```
  ["COND",
    ["FALSE"],
    ["LOG", "This will not get logged"],
    ["TRUE"]
    ["LOG", "This will get logged"]
  ]
  ```
  ```
  ["COND",
    ["TRUE"],
    ["LOG", "This will not logged"],
    ["TRUE"]
    ["LOG", "This will not get logged"]
  ]
  ```
  ```
  ["COND",
    ["FALSE"],
    ["LOG", "This will not get logged"],
    ["FALSE"]
    ["LOG", "This will not get logged"]
  ]
  ```
  ```
  ["COND",
      ["LESS_THAN", ["LENGTH", "$GAME.groupById.player1Deck.stackIds"], 5],
      ["LOG", "player1 has less than 5 cards in their deck"],
      ["TRUE"],
      ["LOG", "player1 has 5 or more cards in their deck"]
  ]
  ```
  ```
  ["COND",
      ["LESS_THAN", "$GAME.cardById.$ACTIVE_CARD_ID.tokens.damage", 3],
      ["LOG", "{{$ACTIVE_CARD.currentFace.name}} has less than 3 damage tokens"],
      ["LESS_THAN", "$GAME.cardById.$ACTIVE_CARD_ID.tokens.damage", 6],
      [
        ["LOG", "{{$ACTIVE_CARD.currentFace.name}} has 3 or more damage tokens"],
        ["LOG", "{{$ACTIVE_CARD.currentFace.name}} has less than 6 damage tokens"],
      ]
      true,
      ["LOG", "{{$ACTIVE_CARD.currentFace.name}} has 6 or more damage tokens"]
  ]
  ```
  ```
  ["COND",
      ["LESS_THAN", "$GAME.roundNumber", 1],
      ["LOG", "It is the first round of the game."]
  ]
  ```
  """

  @doc """
  Executes the 'COND' operation with the given arguments.

  ## Parameters

    - `args`: The arguments required for the 'COND' operation.

  ## Returns

  The result of the 'COND' operation.
  """
  def execute(game, code, trace) do
    # Argument count must be between 2 and infinity, and must be an even number
    argc = Evaluate.argc(code, 2, nil)
    ifthens = Enum.slice(code, 1, Enum.count(code))
    if rem(argc, 2) != 0 do
      raise "COND: Expected an even number of arguments, but got #{Enum.count(ifthens)}"
    end
    Enum.reduce_while(0..Enum.count(ifthens)-1//2, game, fn(i, _acc) ->
      if_statement = Enum.at(ifthens, i)
      result = Evaluate.evaluate(game, if_statement, trace ++ ["index #{i} (if)"])
      if is_boolean(result) or is_nil(result) or result == 1 or result == 0 do
        if result do
          then_statement = Enum.at(ifthens, i+1)
          {:halt, Evaluate.evaluate(game, then_statement, trace ++ ["index #{i} (then)"])}
        else
          {:cont, game}
        end
      else
        raise "COND: Expected a boolean or null result, but #{StringifyVar.stringify_var(if_statement)} resulted in #{StringifyVar.stringify_var(result)}"
      end
    end)
  end


end
