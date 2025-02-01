defmodule DragnCardsGame.Evaluate.Functions.LESS_THAN do
  alias DragnCardsGame.Evaluate
  @moduledoc """
  *Arguments*:
  1. `lhs` (number)
  2. `rhs` (number)

  *Returns*:
  (boolean) The result of the `<` operation. Null values are treated as `0`.

  *Examples*:
  ```
  ["LESS_THAN", 5, 5] => false
  ["LESS_THAN", 5, 4] => false
  ["LESS_THAN", 5, 6] => true
  ["LESS_THAN", 5, null] => false
  ["LESS_THAN", null, 5] => true
  ["LESS_THAN", null, null] => false
  ```
  """

  @doc """
  Executes the 'LESS_THAN' operation with the given arguments.

  ## Parameters

    - `args`: The arguments required for the 'LESS_THAN' operation.

  ## Returns

  The result of the 'LESS_THAN' operation.
  """
  def execute(game, code, trace) do
    {lhs, rhs} = Evaluate.get_lhs_rhs(game, code, trace)
    lhs < rhs
  end


end
