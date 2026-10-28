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
    object = Evaluate.evaluate(game, Evaluate.arg(code, 1), ["object" | trace])
    key = Evaluate.evaluate(game, Evaluate.arg(code, 2), ["key" | trace])
    if !is_map(object) or is_struct(object, MapSet) do
      raise "MAP_DELETE: object must be an object"
    end
    Map.delete(object, key)
  end

end
