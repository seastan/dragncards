defmodule DragnCardsGame.Evaluate.Functions.TARGET_PLAYER_I do
  alias DragnCardsGame.Evaluate
  @moduledoc """
  *Arguments*:
  1. `cardId` (string)
  2. `playerI` (string)
  3. `value` (boolean, optional)

  Sets `playerI`'s targeting of `cardId` to `value` (default `true`).

  *Returns*:
  (game state) The updated game state.

  *Examples*:

  Set `player3`'s targeting of the active card:
  ```
  ["TARGET_PLAYER_N", "$ACTIVE_CARD_ID", "player3"]
  ```
  """

  @doc """
  Executes the 'TARGET_PLAYER_N' operation with the given arguments.

  ## Parameters

    - `args`: The arguments required for the 'TARGET_PLAYER_N' operation.

  ## Returns

  The result of the 'TARGET_PLAYER_N' operation.
  """
  def execute(game, code, trace) do
    argc = Evaluate.argc(code, 2, 3)
    card_id = Evaluate.evaluate(game, Evaluate.arg(code, 1), ["card_id" | trace])
    player_i = Evaluate.evaluate(game, Evaluate.arg(code, 2), ["player_i" | trace])
    value = if argc == 3 do
      Evaluate.evaluate(game, Evaluate.arg(code, 3), ["value" | trace])
    else
      true
    end

    Evaluate.evaluate(game, ["SET", "/cardById/#{card_id}/targeting/#{player_i}", value], ["set" | trace])
  end


end
