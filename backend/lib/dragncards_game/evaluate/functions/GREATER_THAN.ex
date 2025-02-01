defmodule DragnCardsGame.Evaluate.Functions.GREATER_THAN do
  alias DragnCardsGame.Evaluate
  @moduledoc """
  *Arguments*:
  1. `lhs` (number)
  2. `rhs` (number)

  *Returns*:
  (boolean) The result of the `>` operation. Null values are treated as `0`.

  *Examples*:
  ```
  ["GREATER_THAN", 5, 5] => false
  ["GREATER_THAN", 5, 4] => true
  ["GREATER_THAN", 5, 6] => false
  ["GREATER_THAN", 5, null] => true
  ["GREATER_THAN", null, 5] => false
  ["GREATER_THAN", null, null] => false
  ```
  """

  @doc """
  Executes the 'GREATER_THAN' operation with the given arguments.

  ## Parameters

    - `args`: The arguments required for the 'GREATER_THAN' operation.

  ## Returns

  The result of the 'GREATER_THAN' operation.
  """
  def execute(game, code, trace) do
    {lhs, rhs} = Evaluate.get_lhs_rhs(game, code, trace)
    lhs > rhs
  end


end
