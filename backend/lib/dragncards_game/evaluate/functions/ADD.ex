defmodule DragnCardsGame.Evaluate.Functions.ADD do
  alias DragnCardsGame.Evaluate
  @moduledoc """
  *Arguments*:
  1. `lhs` (number)
  2. `rhs` (number)

  Adds the two numbers together. If either number is null, it is treated as 0.

  *Returns*:
  (number) The result of the addition.
  """

  @doc """
  Executes the 'ADD' operation with the given arguments.

  ## Parameters

    - `args`: The arguments required for the 'ADD' operation.

  ## Returns

  The result of the 'ADD' operation.
  """
  def execute(game, code, trace) do
    (Evaluate.evaluate(game, Evaluate.arg(code, 1), ["left" | trace]) || 0) + (Evaluate.evaluate(game, Evaluate.arg(code, 2), ["right" | trace]) || 0)
  end


end
