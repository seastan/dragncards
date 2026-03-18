defmodule DragnCardsGame.Evaluate.Functions.MAP_GET do
  alias DragnCardsGame.Evaluate
  @moduledoc """
  *Arguments*:
  1. `object` (object)
  2. `key` (any)
  3. `default` (any, optional)

  Gets the value for a specific `key` in `object`. If `key` is present in `object` then its value is returned. Otherwise, `default` is returned. If `default` is not provided, `null` is used.

  *Returns*:
  (any) The result.
  """

  @doc """
  Executes the 'MAP_GET' operation with the given arguments.

  ## Parameters

    - `args`: The arguments required for the 'MAP_GET' operation.

  ## Returns

  The result of the 'MAP_GET' operation.
  """
  def execute(game, code, trace) do
    argc = Evaluate.argc(code, 2, 3)
    object = Evaluate.evaluate(game, Enum.at(code, 1), trace ++ ["object"])
    key = Evaluate.evaluate(game, Enum.at(code, 2), trace ++ ["key"])
    default = if argc == 3 do
      Evaluate.evaluate(game, Enum.at(code, 3), trace ++ ["default"])
    else
      nil
    end
    if !is_map(object) do
      raise "MAP_GET: object must be a object"
    end
    Map.get(object, key, default)
  end

end
