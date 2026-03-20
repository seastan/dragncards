defmodule DragnCardsGame.Evaluate.Functions.MAP_SET_DELETE do
  alias DragnCardsGame.Evaluate
  @moduledoc """
  *Arguments*:
  1. `set` (set)
  2. `value` (any)

  Deletes `value` from `set`. If the `value` does not exist, returns `set` unchanged.

  *Returns*:
  (set) The updated set.
  """

  @doc """
  Executes the 'MAP_SET_DELETE' operation with the given arguments.

  ## Parameters

    - `args`: The arguments required for the 'MAP_SET_DELETE' operation.

  ## Returns

  The result of the 'MAP_SET_DELETE' operation.
  """
  def execute(game, code, trace) do
    Evaluate.argc(code, 2)
    set = Evaluate.evaluate(game, Enum.at(code, 1), trace ++ ["set"])
    value = Evaluate.evaluate(game, Enum.at(code, 2), trace ++ ["value"])
    if !is_struct(set, MapSet) do
      raise "MAP_SET_DELETE: set must be a set"
    end
    MapSet.delete(set, value)
  end

end
