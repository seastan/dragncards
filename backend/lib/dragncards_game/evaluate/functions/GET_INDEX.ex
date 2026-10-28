defmodule DragnCardsGame.Evaluate.Functions.GET_INDEX do
  alias DragnCardsGame.Evaluate
  @moduledoc """
  *Arguments*:
  1. list (list)
  2. value (number)

  *Returns*:
  (number) The index of the first occurrence of the given `value` in `list`.
  """

  @doc """
  Executes the 'GET_INDEX' operation with the given arguments.

  ## Parameters

    - `args`: The arguments required for the 'GET_INDEX' operation.

  ## Returns

  The result of the 'GET_INDEX' operation.
  """
  def execute(game, code, trace) do
    list = Evaluate.evaluate(game, Evaluate.arg(code, 1), ["list" | trace])
    value = Evaluate.evaluate(game, Evaluate.arg(code, 2), ["value" | trace])
    Enum.find_index(list, fn(x) -> x == value end)
  end


end
