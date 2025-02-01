defmodule DragnCardsGame.Evaluate.Functions.ABORT do
  alias DragnCardsGame.{Evaluate}
  @moduledoc """
  *Arguments*:
  Any number of string arguments

  Aborts all game state changes performed during the current backend process and halts the further execution of the backend process.

  *Returns*:
  (game state) The game state as it was prior to the most recent backend process, with sting arguments concatenated as an error message.
  """

  @doc """
  Executes the 'ABORT' operation with the given arguments.

  ## Parameters

    - `args`: The arguments required for the 'ABORT' operation.

  ## Returns

  The result of the 'ABORT' operation.
  """
  def execute(game, code, trace) do
    statements = Enum.slice(code, 1, Enum.count(code))
    message = Evaluate.message_list_to_string(game, statements, trace ++ ["message_list_to_string"])
    raise "ABORT: #{message}"
  end

end
