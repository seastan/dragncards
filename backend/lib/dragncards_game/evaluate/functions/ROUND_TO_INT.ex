defmodule DragnCardsGame.Evaluate.Functions.ROUND_TO_INT do
  alias DragnCardsGame.Evaluate
  alias DragnCardsUtil.ConvertType
  @moduledoc """
  *Arguments*:
  1. `val` (string or float)

  Converts a `val` to nearest integer.

  *Returns*:
  (int) The integer value closest to `val`.

  *Examples*:

  ```
  ["ROUND_TO_INT", "4.9"] # returns 5
  ```
  Or
  ```
  ["ROUND_TO_INT", 5.5] # returns 6
  ```

  """

  @doc """
  Executes the 'ROUND_TO_INT' operation with the given arguments.

  ## Parameters

    - `args`: The arguments required for the 'ROUND_TO_INT' operation.

  ## Returns

  The result of the 'ROUND_TO_INT' operation.
  """
  def execute(game, code, trace) do
    val = Evaluate.evaluate(game, Enum.at(code, 1), trace ++ ["val"])
    int_val = ConvertType.convert_to_integer(val)
    round_val = round(int_val)
  end

end
