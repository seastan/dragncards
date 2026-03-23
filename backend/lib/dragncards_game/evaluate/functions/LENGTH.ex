defmodule DragnCardsGame.Evaluate.Functions.LENGTH do
  alias DragnCardsGame.Evaluate
  @moduledoc """
  *Arguments*:
  1. `stringOrList` (string | list | set | object)

  *Returns*:
  (number) The length of the string, list, set, or object.

  """

  @doc """
  Executes the 'LENGTH' operation with the given arguments.

  ## Parameters

    - `args`: The arguments required for the 'LENGTH' operation.

  ## Returns

  The result of the 'LENGTH' operation.
  """
  def execute(game, code, trace) do
    value = Evaluate.evaluate(game, Enum.at(code, 1), trace)
    cond do
      is_binary(value) -> String.length(value)
      is_list(value) -> Enum.count(value)
      is_struct(value, MapSet) -> MapSet.size(value)
      is_map(value) -> Enum.count(value)
      true -> raise("LENGTH: Expected a string, list, set, or object, got #{inspect(value)}.")
    end
  end


end
