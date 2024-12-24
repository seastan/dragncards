defmodule DragnCardsGame.Evaluate.Functions.INDEX_OF do
  alias DragnCardsGame.Evaluate
  @moduledoc """
  *Arguments*:
  1. `inputString` (string)
  2. `subString` (string)

  Finds the index at which the given subString starts in inputString. If subString is not present, returns -1.

  *Returns*:
  (integer) The result of the operation.
  """

  @doc """
  Executes the 'INDEX_OF' operation with the given arguments.

  ## Parameters

    - `args`: The arguments required for the 'INDEX_OF' operation.

  ## Returns

  The result of the 'INDEX_OF' operation.
  """
  def execute(game, code, trace) do
    Evaluate.argc(code, 2)
    inputString = Evaluate.evaluate(game, Enum.at(code, 1), trace ++ ["inputString"])
    subString = Evaluate.evaluate(game, Enum.at(code, 2), trace ++ ["subString"])
    if !is_binary(inputString) do
      raise "INDEX_OF: inputString must be a string"
    end
    if !is_binary(subString) do
      raise "INDEX_OF: subString must be a string"
    end
    case String.split(inputString, subString, parts: 2) do
      [left, _] -> String.length(left)
      [_] -> -1
    end
  end


end
