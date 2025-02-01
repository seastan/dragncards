defmodule DragnCardsGame.Evaluate.Functions.MAP do
  alias DragnCardsGame.Evaluate
  @moduledoc """
  *Arguments*:
  1. `inputList` (list)
  2. `functionName` (string, all caps)

  Take the input list and returns an equal-sized list where the `ith` element is the result of function_name being called on element `i` of `inputList`. The function must take exactly 1 argument.

  *Returns*:
  (list) The result of the map operation.

  *Examples*:
  ```
  [
    ["VAR", "$MY_LIST", ["LIST", 1, 2, 3]],
    ["MAP", "$MY_LIST", "MULTIPLY_BY_TWO"]
  ]
  ```
  Assuming you have `MULTIPLY_BY_TWO` defined, this would return:
  ```
  [2, 4, 6]
  ```
  """

  @doc """
  Executes the 'MAP' operation with the given arguments.

  ## Parameters

    - `args`: The arguments required for the 'MAP' operation.

  ## Returns

  The result of the 'MAP' operation.
  """
  def execute(game, code, trace) do
    input_list = Evaluate.evaluate(game, Enum.at(code, 1), trace ++ ["input_list"])
    function_name = Evaluate.evaluate(game, Enum.at(code, 2), trace ++ ["function_name"])
    Enum.map(Enum.with_index(input_list), fn {element, index} ->
      Evaluate.evaluate(game, [["VAR", "$MAP_INDEX", index], [function_name, element]], trace ++ ["index #{index}"])
    end)
  end


end
