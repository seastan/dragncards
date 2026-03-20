defmodule DragnCardsGame.Evaluate.Functions.MAP_SET_HAS do
  alias DragnCardsGame.Evaluate
  @moduledoc """
  *Arguments*:
  1. `set` (set)
  2. `value` (any)

  Returns whether the given `value` exists in the given `set`.

  *Returns*:
  (boolean) The result.
  """

  @doc """
  Executes the 'MAP_SET_HAS' operation with the given arguments.

  ## Parameters

    - `args`: The arguments required for the 'MAP_SET_HAS' operation.

  ## Returns

  The result of the 'MAP_SET_HAS' operation.
  """
  def execute(game, code, trace) do
    Evaluate.argc(code, 2)
    set = Evaluate.evaluate(game, Enum.at(code, 1), trace ++ ["set"])
    value = Evaluate.evaluate(game, Enum.at(code, 2), trace ++ ["value"])
    if !is_struct(set, MapSet) do
      raise "MAP_SET_HAS: set must be a set"
    end
    MapSet.member?(set, value)
  end

end
