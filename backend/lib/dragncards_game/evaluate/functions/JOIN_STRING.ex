defmodule DragnCardsGame.Evaluate.Functions.JOIN_STRING do
  alias DragnCardsGame.Evaluate
  @moduledoc """
  *Arguments*:
  1. `left` (string)
  2. `right` (string)

  Concatenates the two strings together. If either string is null, it is treated as an empty string.

  *Returns*:
  (string) The result of the concatenation.
  """

  @doc """
  Executes the 'JOIN_STRING' operation with the given arguments.

  ## Parameters

    - `args`: The arguments required for the 'JOIN_STRING' operation.

  ## Returns

  The result of the 'JOIN_STRING' operation.
  """
  def execute(game, code, trace) do
    Evaluate.evaluate(game, Enum.at(code,1), trace ++ ["left"]) <> Evaluate.evaluate(game, Enum.at(code,2), trace ++ ["right"])
  end


end
