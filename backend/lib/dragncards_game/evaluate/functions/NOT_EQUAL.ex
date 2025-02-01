defmodule DragnCardsGame.Evaluate.Functions.NOT_EQUAL do
  alias DragnCardsGame.Evaluate
  @moduledoc """
  *Arguments*:
  1. `lhs` (any)
  2. `rhs` (any)

  Returns `true` if the two values are not equal, `false` otherwise.

  *Returns*:
  (boolean) The result of the comparison.

  *Examples*:

  Check if the value of the variable `X` is not equal to 5:
  ```
  ["NOT_EQUAL", "$X", 5]
  ```
  """

  @doc """
  Executes the 'NOT_EQUAL' operation with the given arguments.

  ## Parameters

    - `args`: The arguments required for the 'NOT_EQUAL' operation.

  ## Returns

  The result of the 'NOT_EQUAL' operation.
  """
  def execute(game, code, trace) do
    Evaluate.evaluate(game, Enum.at(code,1), trace ++ ["left"]) != Evaluate.evaluate(game, Enum.at(code,2), trace ++ ["right"])
  end


end
