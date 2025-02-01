defmodule DragnCardsGame.Evaluate.Functions.REMOVE_FIRST_FROM_LIST_BY_VALUE do
  alias DragnCardsGame.Evaluate
  @moduledoc """
  *Arguments*:
  1. `list` (list)
  2. `value` (any)

  Removes first occurrence of `value` from `list`.

  *Returns*:
  (list) The updated list.
  """

  @doc """
  Executes the 'REMOVE_FIRST_FROM_LIST_BY_VALUE' operation with the given arguments.

  ## Parameters

    - `args`: The arguments required for the 'REMOVE_FIRST_FROM_LIST_BY_VALUE' operation.

  ## Returns

  The result of the 'REMOVE_FIRST_FROM_LIST_BY_VALUE' operation.
  """
  def execute(game, code, trace) do
    list = Evaluate.evaluate(game, Enum.at(code, 1), trace ++ ["list"]) || []
    value = Evaluate.evaluate(game, Enum.at(code, 2), trace ++ ["value"])

    remove_first(list, value)
  end

  defp remove_first([], _value), do: []
  defp remove_first([value | tail], value), do: tail
  defp remove_first([head | tail], value), do: [head | remove_first(tail, value)]


end
