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

    # Define error output directory
    error_dir = "/tmp/plugin_errors"
    File.mkdir_p!(error_dir)

    if is_map(game) and Map.has_key?(game, "pluginName") do
      plugin_name = game["pluginName"]
      plugin_id = game["pluginId"]
      current_ms = :os.system_time(:millisecond)
      base_name = "error_#{current_ms}_#{plugin_id}_#{plugin_name}"
      # Replace any non-alphanumeric characters in base_name with underscores
      base_name = String.replace(base_name, ~r/[^\w]/, "_")
      json_path = Path.join(error_dir, base_name <> ".json")
      txt_path = Path.join(error_dir, base_name <> ".txt")

      # Write game state to JSON
      File.write!(json_path, Jason.encode!(game, pretty: true))

      # Write error message and trace
      File.write!(txt_path, frontend_message)
    end

    put_in(game["messages"], game["messages"] ++ [frontend_message])
  end


end
