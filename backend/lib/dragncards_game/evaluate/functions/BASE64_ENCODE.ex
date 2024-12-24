defmodule DragnCardsGame.Evaluate.Functions.BASE64_ENCODE do
  alias DragnCardsGame.Evaluate
  @moduledoc """
  *Arguments*:
  1. `inputString` (string)

  Encodes the given inputString into a Base64 encoded string (URL safe, without padding).

  *Returns*:
  (string) The result of the operation.
  """

  @doc """
  Executes the 'BASE64_ENCODE' operation with the given argument.

  ## Parameters

    - `args`: The argument required for the 'BASE64_ENCODE' operation.

  ## Returns

  The result of the 'BASE64_ENCODE' operation.
  """
  def execute(game, code, trace) do
    Evaluate.argc(code, 1)
    inputString = Evaluate.evaluate(game, Enum.at(code, 1), trace ++ ["inputString"])
    if !is_binary(inputString) do
      raise "BASE64_ENCODE: inputString must be a string"
    end
    Base.url_encode64(inputString, padding: false)
  end


end
