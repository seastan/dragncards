defmodule DragnCardsGame.Evaluate.Functions.ADD_TEMP_TOKEN do
  alias DragnCardsGame.{Evaluate, GameUI, TempTokens}
  @moduledoc """
  *Arguments*:
  1. `timing` ('step'|'phase'|'round')
  2. `cardId` (string)
  3. `tokenId` (string)
  4. `amount` (integer)

  Adds `amount` temporary token(s) to a card that will be removed the next time `timing` changes value during `NEXT_STEP` or `ADVANCE_TO_STEP`. Will not be removed if `SET` is used to change the game's `stepId` manually.

  The `amount` value can be negative to track temporary debuffs.

  *Returns*:
  (game state) The game state with the temporary token(s) added to the card.

  *Examples*:

  ```
  ["ADD_TEMP_TOKEN", "phase", "$ACTIVE_CARD_ID", "attack", 1]
  ```

  """
  @doc """
  Executes the 'ADD_TEMP_TOKEN' operation with the given arguments.

  ## Parameters

    - `args`: The arguments required for the 'ADD_TEMP_TOKEN' operation.

  ## Returns

  The result of the 'ADD_TEMP_TOKEN' operation.
  """
  def execute(game, code, trace) do

    argc = Evaluate.argc(code, 4)
    timing = Evaluate.evaluate(game, Enum.at(code, 1), trace ++ ["timing"])
    card_id = Evaluate.evaluate(game, Enum.at(code, 2), trace ++ ["card_id"])
    token_id = Evaluate.evaluate(game, Enum.at(code, 3), trace ++ ["token_id"])
    amount = Evaluate.evaluate(game, Enum.at(code, 4), trace ++ ["amount"])

    game = TempTokens.add(game, timing, card_id, token_id, amount)

    game = Evaluate.evaluate(game, [
      ["INCREASE_VAL", "/cardById/#{card_id}/tokens/#{token_id}", amount]
    ], trace ++ ["increase tokens"])
  end



end
