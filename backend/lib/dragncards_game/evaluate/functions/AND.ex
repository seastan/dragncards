defmodule DragnCardsGame.Evaluate.Functions.AND do
  alias DragnCardsGame.Evaluate
  @moduledoc """
  *Arguments*:
  Any number of boolean arguments

  *Returns*:
  (boolean) The result of the 'AND' operation.
  """

  @doc """
  Executes the 'AND' operation with the given arguments.

  ## Parameters

    - `args`: The arguments required for the 'AND' operation.

  ## Returns

  The result of the 'AND' operation.
  """
  def execute(game, code, trace) do
    statements = Enum.slice(code, 1, Enum.count(code) - 1)
    # if game["prev_game"] do
    #   IO.inspect(Evaluate.evaluate(game, ["LOG_DEV", ["PREV", "$TARGET"]], trace ++ ["statements"]))
    # end
    Enum.all?(Enum.with_index(statements), fn {statement, index} ->
      Evaluate.evaluate(game, statement, trace ++ ["index #{index}"])
    end)
  end


end
