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
    timing = Evaluate.evaluate(game, Evaluate.arg(code, 1), ["timing" | trace])
    card_id = Evaluate.evaluate(game, Evaluate.arg(code, 2), ["card_id" | trace])
    token_id = Evaluate.evaluate(game, Evaluate.arg(code, 3), ["token_id" | trace])
    amount = Evaluate.evaluate(game, Evaluate.arg(code, 4), ["amount" | trace])

    game = TempTokens.add(game, timing, card_id, token_id, amount)

    game = Evaluate.evaluate(game, [
      ["INCREASE_VAL", "/cardById/#{card_id}/tokens/#{token_id}", amount]
    ], ["increase tokens" | trace])
  end



end
