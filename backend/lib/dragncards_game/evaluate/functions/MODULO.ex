defmodule DragnCardsGame.Evaluate.Functions.MODULO do
  alias DragnCardsGame.Evaluate
  @moduledoc """
  *Arguments*:
  1. `dividend` (integer)
  2. `divisor` (integer)

  Computes the modulo remainder of an integer division of the `dividend` by the `divisor`. The result will always have the sign of the `divisor`.

  *Returns*:
  (integer) The result of the division.
  """

  @doc """
  Executes the 'MODULO' operation with the given arguments.

  ## Parameters

    - `args`: The arguments required for the 'MODULO' operation.

  ## Returns

  The result of the 'MODULO' operation.
  """
  def execute(game, code, trace) do
    Evaluate.argc(code, 2)
    dividend = Evaluate.evaluate(game, Enum.at(code, 1), trace ++ ["dividend"])
    divisor = Evaluate.evaluate(game, Enum.at(code, 2), trace ++ ["divisor"])
    if !is_integer(dividend) do
      raise "MODULO: dividend must be an integer"
    end
    if !is_integer(divisor) or divisor == 0 do
      raise "MODULO: divisor must be a non-zero integer"
    end
    Integer.mod(dividend, divisor)
  end


end
