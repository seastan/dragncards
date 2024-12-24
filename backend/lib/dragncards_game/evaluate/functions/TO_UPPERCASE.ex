defmodule DragnCardsGame.Evaluate.Functions.TO_UPPERCASE do
  alias DragnCardsGame.Evaluate
  @moduledoc """
  *Arguments*:
  1. `inputString` (string)

  Converts all characters in the given inputString to uppercase.

  *Returns*:
  (string) The result of the operation.
  """

  @doc """
  Executes the 'TO_UPPERCASE' operation with the given argument.

  ## Parameters

    - `args`: The argument required for the 'TO_UPPERCASE' operation.

  ## Returns

  The result of the 'TO_UPPERCASE' operation.
  """
  def execute(game, code, trace) do
    Evaluate.argc(code, 1)
    inputString = Evaluate.evaluate(game, Enum.at(code, 1), trace ++ ["inputString"])
    if !is_binary(inputString) do
      raise "TO_UPPERCASE: inputString must be a string"
    end
    String.upcase(inputString)
  end


end
