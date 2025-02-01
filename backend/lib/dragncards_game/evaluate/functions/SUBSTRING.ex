defmodule DragnCardsGame.Evaluate.Functions.SUBSTRING do
  alias DragnCardsGame.Evaluate
  @moduledoc """
  *Arguments*:
  1. `string` (string)
  2. `start` (integer)
  3. `length` (integer)

  Returns a substring of the given string, starting at the given index and with the given length.

  *Returns*:
  (string) The substring.

  """

  @doc """
  Executes the 'SUBSTRING' operation with the given arguments.

  ## Parameters

    - `args`: The arguments required for the 'SUBSTRING' operation.

  ## Returns

  The result of the 'SUBSTRING' operation.
  """
  def execute(game, code, trace) do
    string = Evaluate.evaluate(game, Enum.at(code,1), trace ++ ["string"])
    start = Evaluate.evaluate(game, Enum.at(code,2), trace ++ ["start"])
    length = Evaluate.evaluate(game, Enum.at(code,3), trace ++ ["length"])
    if string == nil || start == nil || length == nil do
      raise "Tried to call SUBSTRING with nil arguments. string: #{string}, start: #{start}, length: #{length}"
    else
      String.slice(string, start..start+length-1)
    end
  end


end
