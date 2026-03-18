defmodule DragnCardsGame.Evaluate.Functions.MAP_SET_PUT do
  alias DragnCardsGame.Evaluate
  @moduledoc """
  *Arguments*:
  1. `set` (set)
  2. `value` (any)

  Inserts `value` into `set` if `set` doesn't already contain it.

  *Returns*:
  (object) The updated set.
  """

  @doc """
  Executes the 'MAP_SET_PUT' operation with the given arguments.

  ## Parameters

    - `args`: The arguments required for the 'MAP_SET_PUT' operation.

  ## Returns

  The result of the 'MAP_SET_PUT' operation.
  """
  def execute(game, code, trace) do
    Evaluate.argc(code, 2)
    set = Evaluate.evaluate(game, Enum.at(code, 1), trace ++ ["set"])
    value = Evaluate.evaluate(game, Enum.at(code, 2), trace ++ ["value"])
    if !is_struct(set, MapSet) do
      raise "MAP_SET_PUT: set must be a set"
    end
    MapSet.put(set, value)
  end

end
