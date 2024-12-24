defmodule DragnCardsGame.Evaluate.Functions.TO_LOWERCASE do
  alias DragnCardsGame.Evaluate
  @moduledoc """
  *Arguments*:
  1. `inputString` (string)

  Converts all characters in the given inputString to lowercase.

  *Returns*:
  (string) The result of the operation.
  """

  @doc """
  Executes the 'TO_LOWERCASE' operation with the given argument.

  ## Parameters

    - `args`: The argument required for the 'TO_LOWERCASE' operation.

  ## Returns

  The result of the 'TO_LOWERCASE' operation.
  """
  def execute(game, code, trace) do
    Evaluate.argc(code, 1)
    inputString = Evaluate.evaluate(game, Enum.at(code, 1), trace ++ ["inputString"])
    if !is_binary(inputString) do
      raise "TO_LOWERCASE: inputString must be a string"
    end
    String.downcase(inputString)
  end


end
