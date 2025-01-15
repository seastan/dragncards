defmodule DragnCardsGame.Evaluate.Functions.LOGF do
  alias DragnCardsGame.Evaluate
  @moduledoc """
  *Arguments*:
  1. `formatString` (string)
  2. Any number of arguments

  Combines a call to `FORMAT` operation with a call to `LOG` operation.

  *Returns*:
  (game state) The game state with the message added to the log.
  """

  @doc """
  Executes the 'LOGF' operation with the given arguments.

  ## Parameters

    - `args`: The arguments required for the 'LOGF' operation.

  ## Returns

  The result of the 'LOGF' operation.
  """
  def execute(game, code, trace) do
    message = DragnCardsGame.Evaluate.Functions.FORMAT.execute(game, code, trace ++ ["message"])
    put_in(game["messages"], game["messages"] ++ [message])
  end


end
