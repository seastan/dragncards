defmodule DragnCardsGame.Evaluate.Functions.MAP_HAS_KEY do
  alias DragnCardsGame.Evaluate
  @moduledoc """
  *Arguments*:
  1. `object` (object)
  2. `key` (any)

  Returns whether the given `key` exists in the given `object`.

  *Returns*:
  (boolean) The result.
  """

  @doc """
  Executes the 'MAP_HAS_KEY' operation with the given arguments.

  ## Parameters

    - `args`: The arguments required for the 'MAP_HAS_KEY' operation.

  ## Returns

  The result of the 'MAP_HAS_KEY' operation.
  """
  def execute(game, code, trace) do
    Evaluate.argc(code, 2)
    object = Evaluate.evaluate(game, Enum.at(code, 1), trace ++ ["object"])
    key = Evaluate.evaluate(game, Enum.at(code, 2), trace ++ ["key"])
    if !is_map(object) or is_struct(object, MapSet) do
      raise "MAP_HAS_KEY: object must be an object"
    end
    Map.has_key?(object, key)
  end

end
