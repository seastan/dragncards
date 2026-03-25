defmodule DragnCardsGame.Evaluate.Functions.MAP_SET_TO_LIST do
  alias DragnCardsGame.Evaluate
  @moduledoc """
  *Arguments*:
  1. `set` (set)

  Returns all values from `set` as list.

  *Returns*:
  (list) List of values.
  """

  @doc """
  Executes the 'MAP_SET_TO_LIST' operation with the given arguments.

  ## Parameters

    - `args`: The arguments required for the 'MAP_SET_TO_LIST' operation.

  ## Returns

  The result of the 'MAP_SET_TO_LIST' operation.
  """
  def execute(game, code, trace) do
    Evaluate.argc(code, 1)
    set = Evaluate.evaluate(game, Enum.at(code, 1), trace ++ ["set"])
    if !is_struct(set, MapSet) do
      raise "MAP_SET_TO_LIST: set must be a set"
    end
    MapSet.to_list(set)
  end

end
