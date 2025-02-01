defmodule DragnCardsGame.Evaluate.Functions.AT_INDEX do
  alias DragnCardsGame.Evaluate
  @moduledoc """
  *Arguments*:
  1. `list` (list)
  2. `index` (number)

  Returns the element at the given index in the list. If the list is null, it returns null.

  *Returns*:
  (any) The element at the given index in the list.
  """

  @doc """
  Executes the 'AT_INDEX' operation with the given arguments.

  ## Parameters

    - `args`: The arguments required for the 'AT_INDEX' operation.

  ## Returns

  The result of the 'AT_INDEX' operation.
  """
  def execute(game, code, trace) do
    list = Evaluate.evaluate(game, Enum.at(code, 1), trace ++ ["list"])
    index = Evaluate.evaluate(game, Enum.at(code, 2), trace ++ ["index"])
    if list do Enum.at(list, index) else nil end
  end


end
