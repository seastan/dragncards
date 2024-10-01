defmodule DragnCardsGame.Evaluate.Functions.REPLACE_STRING_IN_LIST do
  alias DragnCardsGame.Evaluate
  @moduledoc """
  *Arguments*:
  1. `inputList` (list)
  2. `stringToReplace` (string)
  3. `replacementString` (string)

  Replaces each occurrence of the `stringToReplace` in the input list (even substrings) with the given `replacementString`. Works on deeply nested lists.

  *Returns*:
  (string) The updated list.
  """

  @doc """
  Executes the 'REPLACE_STRING_IN_LIST' operation with the given arguments.

  ## Parameters

    - `args`: The arguments required for the 'REPLACE_STRING_IN_LIST' operation.

  ## Returns

  The result of the 'REPLACE_STRING_IN_LIST' operation.
  """
  def replace_string_in_list(input_list, string_to_replace, replacement_string) do
    Enum.map(input_list, fn
      x when is_list(x) -> replace_string_in_list(x, string_to_replace, replacement_string)
      x when is_binary(x) -> Regex.replace(~r/#{string_to_replace}/, x, replacement_string)
      x -> x
    end)
  end

  def execute(game, code, trace) do
    Evaluate.argc(code, 3)
    input_string = Evaluate.evaluate(game, Enum.at(code, 1), trace ++ ["inputString"])
    string_to_replace = Evaluate.evaluate(game, Enum.at(code, 2), trace ++ ["stringToReplace"])
    replacement_string = Evaluate.evaluate(game, Enum.at(code, 3), trace ++ ["replacementString"])
    if !is_list(input_string) do
      raise "REPLACE_STRING_IN_LIST: inputString must be a list"
    end
    if !is_binary(string_to_replace) do
      raise "REPLACE_STRING_IN_LIST: stringToReplace must be a string"
    end
    if !is_binary(replacement_string) do
      raise "REPLACE_STRING_IN_LIST: replacementString must be a string"
    end
    replace_string_in_list(input_string, string_to_replace, replacement_string)
  end

end
