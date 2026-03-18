defmodule DragnCardsGame.Evaluate.Functions.MAP_PUT do
  alias DragnCardsGame.Evaluate
  @moduledoc """
  *Arguments*:
  1. `object` (object)
  2. `key` (any)
  3. `value` (any)

  Puts the given `value` under `key` in `object`.

  *Returns*:
  (object) The updated object.
  """

  @doc """
  Executes the 'MAP_PUT' operation with the given arguments.

  ## Parameters

    - `args`: The arguments required for the 'MAP_PUT' operation.

  ## Returns

  The result of the 'MAP_PUT' operation.
  """
  def execute(game, code, trace) do
    Evaluate.argc(code, 3)
    object = Evaluate.evaluate(game, Enum.at(code, 1), trace ++ ["object"])
    key = Evaluate.evaluate(game, Enum.at(code, 2), trace ++ ["key"])
    value = Evaluate.evaluate(game, Enum.at(code, 3), trace ++ ["value"])
    if !is_map(object) or is_struct(object, MapSet) do
      raise "MAP_PUT: object must be a object"
    end
    Map.put(object, key, value)
  end

end
