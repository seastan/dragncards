defmodule DragnCardsGame.Evaluate.Functions.LESS_EQUAL do
  alias DragnCardsGame.Evaluate
  @moduledoc """
  *Arguments*:
  1. `lhs` (number)
  2. `rhs` (number)

  *Returns*:
  (boolean) The result of the `<=` operation. Null values are treated as `0`.

  *Examples*:
  ```
  ["LESS_EQUAL", 5, 5] => true
  ["LESS_EQUAL", 5, 4] => false
  ["LESS_EQUAL", 5, 6] => true
  ["LESS_EQUAL", 5, null] => false
  ["LESS_EQUAL", null, 5] => true
  ["LESS_EQUAL", null, null] => true
  ```
  """

  @doc """
  Executes the 'LESS_EQUAL' operation with the given arguments.

  ## Parameters

    - `args`: The arguments required for the 'LESS_EQUAL' operation.

  ## Returns

  The result of the 'LESS_EQUAL' operation.
  """
  def execute(game, code, trace) do
    {lhs, rhs} = Evaluate.get_lhs_rhs(game, code, trace)
    lhs <= rhs
  end


end
