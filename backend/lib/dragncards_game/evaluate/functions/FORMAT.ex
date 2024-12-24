defmodule DragnCardsGame.Evaluate.Functions.FORMAT do
  alias DragnCardsGame.Evaluate
  @moduledoc """
  *Arguments*:
  1. `formatString` (string)
  2. Any number of arguments

  Returns a formatted string using `formatString` and additional arguments converted using the `LABEL` operation.

  Placeholders to insert additional arguments are in the `{index}` format, for example `{0}`.

  *Returns*:
  (string) The result of the operation.
  """

  @doc """
  Executes the 'FORMAT' operation with the given arguments.

  ## Parameters

    - `args`: The arguments required for the 'FORMAT' operation.

  ## Returns

  The result of the 'FORMAT' operation.
  """
  def execute(game, code, trace) do
    formatString = Evaluate.evaluate(game, Enum.at(code, 1), trace ++ ["formatString"])
    if !is_binary(formatString) do
      raise "FORMAT: formatString must be a string"
    end
    list = Enum.slice(code, 2, Enum.count(code))
    Enum.reduce(Enum.with_index(list), formatString, fn({item, index}, acc)->
      String.replace(acc, "{#{index}}", DragnCardsGame.Evaluate.Functions.LABEL.to_string(game, item, trace ++ ["index #{index}"]))
    end)
  end


end
