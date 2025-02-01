defmodule DragnCardsGame.Evaluate.Functions.CALC do
  alias DragnCardsGame.Evaluate
  alias DragnCardsUtil.StringMath
  @moduledoc """
  *Arguments*:
  1. `string` (string)

  Evaluates the given string as a mathematical expression.

  *Returns*:
  (number) The result of the calculation.

  *Examples*:
  ```
  ["CALC", "1+1"] => 2
  ```
  ```
  ["CALC", "2*3"] => 6
  ```
  ```
  ["CALC", "4/(2^3)"] => 0.5
  ```


  """

  @doc """
  Executes the 'CALC' operation with the given arguments.

  ## Parameters

    - `args`: The arguments required for the 'CALC' operation.

  ## Returns

  The result of the 'CALC' operation.
  """
  def execute(game, code, trace) do
    string = Evaluate.evaluate(game, Enum.at(code,1), trace ++ ["pre-parse"]) # Parse the string for {{}}
    StringMath.evaluate_string(string)
  end


end
