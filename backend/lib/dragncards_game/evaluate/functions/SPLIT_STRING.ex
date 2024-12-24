defmodule DragnCardsGame.Evaluate.Functions.SPLIT_STRING do
  alias DragnCardsGame.Evaluate
  @moduledoc """
  *Arguments*:
  1. `inputString` (string)
  2. `separatorString` (string)

  Divides the given inputString into a list of parts using separatorString as a separator. Empty strings are removed from the result.

  *Returns*:
  (list) The result of the operation.
  """

  @doc """
  Executes the 'SPLIT_STRING' operation with the given arguments.

  ## Parameters

    - `args`: The arguments required for the 'SPLIT_STRING' operation.

  ## Returns

  The result of the 'SPLIT_STRING' operation.
  """
  def execute(game, code, trace) do
    Evaluate.argc(code, 2)
    inputString = Evaluate.evaluate(game, Enum.at(code, 1), trace ++ ["inputString"])
    separatorString = Evaluate.evaluate(game, Enum.at(code, 2), trace ++ ["separatorString"])
    if !is_binary(inputString) do
      raise "SPLIT_STRING: inputString must be a string"
    end
    if !is_binary(separatorString) do
      raise "SPLIT_STRING: separatorString must be a string"
    end
    String.split(inputString, separatorString, trim: true)
  end


end
