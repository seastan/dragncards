defmodule DragnCardsGame.Evaluate.Functions.DECREASE_VAL do
  alias DragnCardsGame.{Evaluate,PutByPath}
  @moduledoc """
  *Arguments*:
  1. `path` (string of keys separated by `/`)
  2. `delta` (number)

  Decreases the value at the `path` by the `delta`. If the current value at `path` is `null`, it is treated as `0`.

  This function calls the `SET` function under the hood, so it will trigger automations listening to `path`.

  *Returns*:
  (game state) The game state with the value at `path` decreased by `delta`.

  *Examples*:

  Decrease the nummber of damage tokens on the active card by 5:
  ```
  ["DECREASE_VAL", "/cardById/$ACTIVE_CARD_ID/tokens/damage", 5]
  ```


  """

  @doc """
  Executes the 'DECREASE_VAL' operation with the given arguments.

  ## Parameters

    - `args`: The arguments required for the 'DECREASE_VAL' operation.

  ## Returns

  The result of the 'DECREASE_VAL' operation.
  """
  def execute(game, code, trace) do
    path = Evaluate.evaluate(game, Enum.at(code, 1), trace ++ ["path"])
    delta = Evaluate.evaluate(game, Enum.at(code, 2), trace ++ ["delta"])
    old_value = get_in(game, path) || 0
    PutByPath.put_by_path(game, path, old_value - delta, trace ++ ["put_by_path"])
  end


end
