defmodule DragnCardsGame.Evaluate.Functions.REGEX_REPLACE do
  alias DragnCardsGame.Evaluate
  @moduledoc """
  *Arguments*:
  1. `inputString` (string)
  2. `regexString` (string)

  Replaces the first occurrence of the regex in the input string with the given value.

  *Returns*:
  (string) The updated string.
  """

  @doc """
  Executes the 'REGEX_REPLACE' operation with the given arguments.

  ## Parameters

    - `args`: The arguments required for the 'REGEX_REPLACE' operation.

  ## Returns

  The result of the 'REGEX_REPLACE' operation.
  """
  def execute(game, code, trace) do
    input_string = Evaluate.evaluate(game, Enum.at(code, 1), trace ++ ["inputString"])
    regex_string = Evaluate.evaluate(game, Enum.at(code, 2), trace ++ ["regexString"])
    replacement_string = Evaluate.evaluate(game, Enum.at(code, 3), trace ++ ["replacementString"])
    IO.inspect(input_string)
    IO.inspect(regex_string)
    IO.inspect(replacement_string)
    case Regex.compile(regex_string, "i") do
      {:ok, regex} ->
        result = Regex.replace(regex, input_string, replacement_string)
        result
      {:error, _reason} -> raise "Regex compile failed"
    end
  end

end
