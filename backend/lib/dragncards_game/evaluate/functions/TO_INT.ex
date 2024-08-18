defmodule DragnCardsGame.Evaluate.Functions.TO_INT do
  alias DragnCardsGame.Evaluate
  alias DragnCardsUtil.ConvertType
  @moduledoc """
  *Arguments*:
  1. `val` (string or float)

  Converts a `val` to an integer.

  *Returns*:
  (int) The integer value of `val`.

  *Examples*:

  ```
  ["TO_INT", "5"]
  ```
  Or
  ```
  ["TO_INT", 5.5]
  ```

  """

  @doc """
  Executes the 'TO_INT' operation with the given arguments.

  ## Parameters

    - `args`: The arguments required for the 'TO_INT' operation.

  ## Returns

  The result of the 'TO_INT' operation.
  """
  def execute(game, code, trace) do
    val = Evaluate.evaluate(game, Enum.at(code, 1), trace ++ ["val"])
    ConvertType.convert_to_integer(val)
  end

end
