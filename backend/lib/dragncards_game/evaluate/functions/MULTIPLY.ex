defmodule DragnCardsGame.Evaluate.Functions.MULTIPLY do
  alias DragnCardsGame.Evaluate
  @moduledoc """
  *Arguments*:
  1. `lhs` (number)
  2. `rhs` (number)

  Multiplies the two numbers together. If either number is `null`, it is treated as `0`.

  *Returns*:
  (number) The result of the multiplication.

  *Examples*:

  Multiply 3 by 4:
  ```
  ["MULTIPLY", 3, 4]
  ```
  Multiply the value of the variable `X` by 5:
  ```
  ["MULTIPLY", "$X", 5]
  ```
  """

  @doc """
  Executes the 'MULTIPLY' operation with the given arguments.

  ## Parameters

    - `args`: The arguments required for the 'MULTIPLY' operation.

  ## Returns

  The result of the 'MULTIPLY' operation.
  """
  def execute(game, code, trace) do
    (Evaluate.evaluate(game, Evaluate.arg(code, 1), ["left" | trace]) || 0) * (Evaluate.evaluate(game, Evaluate.arg(code, 2), ["right" | trace]) || 0)
  end


end
