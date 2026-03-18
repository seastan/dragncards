defmodule DragnCardsGame.Evaluate.Functions.MAP_DELETE do
  alias DragnCardsGame.Evaluate
  @moduledoc """
  *Arguments*:
  1. `object` (object)
  2. `key` (any)

  Deletes the entry in `object` for a specific `key`. If the `key` does not exist, returns `object` unchanged.

  *Returns*:
  (object) The updated object.
  """

  @doc """
  Executes the 'MAP_DELETE' operation with the given arguments.

  ## Parameters

    - `args`: The arguments required for the 'MAP_DELETE' operation.

  ## Returns

  The result of the 'MAP_DELETE' operation.
  """
  def execute(game, code, trace) do
    Evaluate.argc(code, 2)
    object = Evaluate.evaluate(game, Enum.at(code, 1), trace ++ ["object"])
    key = Evaluate.evaluate(game, Enum.at(code, 2), trace ++ ["key"])
    if !is_map(object) do
      raise "MAP_DELETE: object must be a object"
    end
    Map.delete(object, key)
  end

end
