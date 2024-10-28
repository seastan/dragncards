defmodule DragnCardsGame.Evaluate.Functions.TARGET do
  alias DragnCardsGame.Evaluate
  @moduledoc """
  *Arguments*:
  1. `cardId` (string)

  Shorthand for `["SET", "/cardById/cardId/targeting/$PLAYER_N", true]`

  *Returns*:
  (game state) The updated game state.

  *Examples*:

  Target the active card:
  ```
  ["TARGET", "$ACTIVE_CARD_ID"]
  ```
  """

  @doc """
  Executes the 'TARGET' operation with the given arguments.

  ## Parameters

    - `args`: The arguments required for the 'TARGET' operation.

  ## Returns

  The result of the 'TARGET' operation.
  """
  def execute(game, code, trace) do
    Evaluate.argc(code, 1)
    card_id = Evaluate.evaluate(game, Enum.at(code, 1), trace ++ ["card_id"])
    Evaluate.evaluate(game, ["SET", "/cardById/" <> card_id <> "/targeting/$PLAYER_N", true], trace ++ ["set"])
  end


end
