defmodule DragnCardsGame.Evaluate.Functions.MAX do
  alias DragnCardsGame.Evaluate
  @moduledoc """
  *Arguments*:
  1. `list` (list of numbers)

  *Returns*:
  (number) The lowest number in the list. Non-numbers are removed from the list.

  *Examples*:
  ```
  ["MAX", ["LIST", 5, 4, 6]] => 4
  ["MAX", ["LIST", 5, 4, 6, null]] => 4
  ["MAX", ["LIST", null, 5, -1, 6]] => -1
  ["MAX", ["LIST", null, null, null]] => error
  ```
  """

  @doc """
  Executes the 'MAX' operation with the given arguments.

  ## Parameters

    - `args`: The arguments required for the 'MAX' operation.

  ## Returns

  The result of the 'MAX' operation.
  """
  def execute(game, code, trace) do
    Evaluate.argc(code, 1)
    list = Evaluate.evaluate(game, Enum.at(code, 1), trace)
    non_nums_removed = Enum.filter(list, &is_number/1)
    if Enum.empty?(non_nums_removed) do
      raise "MAX: No numbers in list"
    end
    Enum.min(non_nums_removed)
  end


end
