defmodule DragnCardsGame.Evaluate.Functions.BASE64_DECODE do
  alias DragnCardsGame.Evaluate
  @moduledoc """
  *Arguments*:
  1. `inputString` (string)

  Decodes the given Base64 encoded (URL safe, without padding) inputString into a string.

  *Returns*:
  (string) The result of the operation.
  """

  @doc """
  Executes the 'BASE64_DECODE' operation with the given argument.

  ## Parameters

    - `args`: The argument required for the 'BASE64_DECODE' operation.

  ## Returns

  The result of the 'BASE64_DECODE' operation.
  """
  def execute(game, code, trace) do
    Evaluate.argc(code, 1)
    inputString = Evaluate.evaluate(game, Enum.at(code, 1), trace ++ ["inputString"])
    if !is_binary(inputString) do
      raise "BASE64_DECODE: inputString must be a string"
    end
    case Base.url_decode64(inputString, padding: false) do
      {:ok, decodedString} -> decodedString
      :error -> raise "BASE64_DECODE: inputString must be a valid Base64 string (URL safe, without padding)"
    end
  end


end
