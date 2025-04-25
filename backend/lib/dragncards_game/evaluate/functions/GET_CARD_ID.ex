defmodule DragnCardsGame.Evaluate.Functions.GET_CARD_ID do
  alias DragnCardsGame.Evaluate
  @moduledoc """
  *Arguments*:
  1. `groupId` (string)
  2. `stackIndex` (number)
  3. `cardIndex` (number)

  Returns the card id at the given `cardIndex` in the stack with the given `groupId` and `stackIndex`. If the stack is null, it returns null.

  *Returns*:
  (string) The card id at the given index in the stack.

  *Examples*

  To get the top card id of your deck:
  ```
  ["GET_CARD_ID", "{{$PLAYER_N}}Deck", 0, 0]
  ```

  This is equivalent to:
  ```
  [
    ["VAR", "$TOP_STACK_ID", "$GAME.groupById.{{$PLAYER_N}}Deck.stackIds.[0]"],
    "$GAME.stackById.$TOP_STACK_ID.cardIds.[0]"
  ]
  ```
  or:
  ```
  "$GAME.groupById.{{$PLAYER_N}}Deck.parentCardIds.[0]"
  ```


  """

  @doc """
  Executes the 'GET_CARD_ID' operation with the given arguments.

  ## Parameters

    - `args`: The arguments required for the 'GET_CARD_ID' operation.

  ## Returns

  The result of the 'GET_CARD_ID' operation.
  """
  def execute(game, code, trace) do
    group_id = Evaluate.evaluate(game, Enum.at(code,1), trace ++ ["group_id"])
    stack_index = Evaluate.evaluate(game, Enum.at(code,2), trace ++ ["stack_index"])
    stack_id = Evaluate.evaluate(game, ["GET_STACK_ID", group_id, stack_index], trace ++ ["stack_id"])
    card_index = Evaluate.evaluate(game, Enum.at(code,3), trace ++ ["card_index"])
    if stack_id do
      Evaluate.evaluate(game, ["AT_INDEX", "$GAME.stackById." <> stack_id <> ".cardIds", card_index], trace ++ ["card_id"])
    else
      nil
    end
  end


end
