defmodule DragnCardsGame.Evaluate.Functions.GREATER_EQUAL do
  alias DragnCardsGame.Evaluate
  @moduledoc """
  *Arguments*:
  1. `lhs` (number)
  2. `rhs` (number)

  *Returns*:
  (boolean) The result of the `>=` operation. Null values are treated as `0`.

  *Examples*:
  ```
  ["GREATER_EQUAL", 5, 5] => true
  ["GREATER_EQUAL", 5, 4] => true
  ["GREATER_EQUAL", 5, 6] => false
  ["GREATER_EQUAL", 5, null] => false
  ["GREATER_EQUAL", null, 5] => false
  ["GREATER_EQUAL", null, null] => true
  ```
  """

  @doc """
  Executes the 'GREATER_EQUAL' operation with the given arguments.

  ## Parameters

    - `args`: The arguments required for the 'GREATER_EQUAL' operation.

  ## Returns

  The result of the 'GREATER_EQUAL' operation.
  """
  def execute(game, code, trace) do
    {lhs, rhs} = Evaluate.get_lhs_rhs(game, code, trace)
    lhs >= rhs
  end


end
