defmodule DragnCardsGame.Evaluate.Functions.MIN do
  alias DragnCardsGame.Evaluate
  @moduledoc """
  *Arguments*:
  1. `list` (list of numbers)

  *Returns*:
  (number) The lowest number in the list. Non-numbers are removed from the list.

  *Examples*:
  ```
  ["MIN", ["LIST", 5, 4, 6]] => 4
  ["MIN", ["LIST", 5, 4, 6, null]] => 4
  ["MIN", ["LIST", null, 5, -1, 6]] => -1
  ["MIN", ["LIST", null, null, null]] => error
  ```
  """

  @doc """
  Executes the 'MIN' operation with the given arguments.

  ## Parameters

    - `args`: The arguments required for the 'MIN' operation.

  ## Returns

  The result of the 'MIN' operation.
  """
  def execute(game, code, trace) do
    Evaluate.argc(code, 1)
    list = Evaluate.evaluate(game, Enum.at(code, 1), trace)
    non_nums_removed = Enum.filter(list, &is_number/1)
    if Enum.empty?(non_nums_removed) do
      raise "MIN: No numbers in list"
    end
    Enum.min(non_nums_removed)
  end


end
