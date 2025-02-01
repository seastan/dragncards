defmodule DragnCardsGame.Evaluate.Functions.POINTER do
  @moduledoc """
  *Arguments*:
  1. `code` (DragnLang code)

  Creates a pointer to a `code` and does not evaluate `code` right away. Useful for creating lambdas or other functions that need to be evaluated later.

  To call the code that was passed in, use the `"ACTION_LIST"` function to evaluate the code and get the result.

  *Returns*:
  (DragnLang code) The code that was passed in.

  *Examples*:

  ```
  [
    ["VAR", "$LAZY_ADD", ["POINTER", ["ADD", "$A", "$B"]]],
    ["VAR", "$A", 5],
    ["VAR", "$B", 3],
    ["VAR", "$RESULT", ["ACTION_LIST", "$LAZY_ADD"]],
    ["LOG", "$RESULT"], // Logs 8
    ["VAR", "$B", 20],
    ["VAR", "$RESULT", ["ACTION_LIST", "$LAZY_ADD"]],
    ["LOG", "$RESULT"], // Logs 25
  ]
  ```
  """

  @doc """
  Executes the 'POINTER' operation with the given arguments.

  ## Parameters

    - `args`: The arguments required for the 'POINTER' operation.

  ## Returns

  The result of the 'POINTER' operation.
  """
  def execute(_game, code, _trace) do
    Enum.at(code, 1)
  end


end
