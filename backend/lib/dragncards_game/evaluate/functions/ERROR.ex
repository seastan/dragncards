defmodule DragnCardsGame.Evaluate.Functions.ERROR do
  alias DragnCardsGame.Evaluate
  require Logger
  @moduledoc """
  *Arguments*:
  1. `message` (string)

  Adds an error message to the log.

  *Returns*:
  (game state) The game state with the error message added to the log.
  """

  @doc """
  Executes the 'ERROR' operation with the given arguments.

  ## Parameters

    - `args`: The arguments required for the 'ERROR' operation.

  ## Returns

  The result of the 'ERROR' operation.
  """
  def execute(game, code, trace) do
    alias_n = try do
      Evaluate.evaluate(game, "$ALIAS_N", trace)
    rescue
      _ ->
        "Anonymous"
    end
    message = Enum.at(code, 1)
    backend_message = "in #{game["pluginName"]} triggered by #{alias_n}#{message}"
    Logger.error(backend_message)
    frontend_message = "Error " <> backend_message
    put_in(game["messages"], game["messages"] ++ [frontend_message])
  end


end
