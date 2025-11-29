defmodule DragnCardsGame.Evaluate.Functions.EQUAL do
  alias DragnCardsGame.Evaluate
  @moduledoc """
  *Arguments*:
  1. `lhs` (any)
  2. `rhs` (any)

  Compares the two values for equality.

  *Returns*:
  (boolean) The result of the comparison.

  *Examples*:
  ```
  ["EQUAL", 1, 1] -> true
  ["EQUAL", 1, 2] -> false
  ["EQUAL", "a", "a"] -> true
  ["EQUAL", "a", "b"] -> false
  ["EQUAL", null, null] -> true
  ["EQUAL", null, 1] -> false
  ["EQUAL", "$GAME.firstPlayer", "player1"] -> true if the first player is "player1"
  ```
  """

  @doc """
  Executes the 'EQUAL' operation with the given arguments.

  ## Parameters

    - `args`: The arguments required for the 'EQUAL' operation.

  ## Returns

  The result of the 'EQUAL' operation.
  """
  def execute(game, code, trace) do
    lhs = Evaluate.evaluate(game, Enum.at(code,1), trace ++ ["left"])
    rhs = Evaluate.evaluate(game, Enum.at(code,2), trace ++ ["right"])
    lhs == rhs
  end


end
