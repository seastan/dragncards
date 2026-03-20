defmodule DragnCardsGame.Evaluate.Functions.MAP_VALUES_TO_LIST do
  alias DragnCardsGame.Evaluate
  @moduledoc """
  *Arguments*:
  1. `object` (object)

  Returns all values from `object` as list.

  *Returns*:
  (list) List of values.
  """

  @doc """
  Executes the 'MAP_VALUES_TO_LIST' operation with the given arguments.

  ## Parameters

    - `args`: The arguments required for the 'MAP_VALUES_TO_LIST' operation.

  ## Returns

  The result of the 'MAP_VALUES_TO_LIST' operation.
  """
  def execute(game, code, trace) do
    Evaluate.argc(code, 1)
    object = Evaluate.evaluate(game, Enum.at(code, 1), trace ++ ["object"])
    if !is_map(object) or is_struct(object, MapSet) do
      raise "MAP_VALUES_TO_LIST: object must be an object"
    end
    Map.values(object)
  end

end
