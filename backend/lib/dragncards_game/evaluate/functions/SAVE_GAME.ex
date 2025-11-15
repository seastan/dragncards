defmodule DragnCardsGame.Evaluate.Functions.SAVE_GAME do
  require Logger
  alias DragnCardsGame.{Evaluate, Game}
  @moduledoc """
  *Arguments*:
  None

  Saves the current game state to the database for the current player.
  The game is saved as a replay that can be loaded later.

  *Returns*:
  (game state) The unchanged game state.

  *Examples*:

  Save the current game:
  ```
  ["SAVE_GAME"]
  ```
  """

  @doc """
  Executes the 'SAVE_GAME' operation.

  ## Parameters

    - `game`: The current game state
    - `code`: The code containing the function call
    - `trace`: The execution trace for debugging

  ## Returns

  The unchanged game state after saving to database.
  """
  def execute(game, code, trace) do
    try do
      # Get the current player's user_id
      player_n = Evaluate.evaluate(game, "$PLAYER_N", trace ++ ["player_n"])
      user_id = game["playerData"][player_n]["user_id"]

      if user_id == nil do
        raise "SAVE_GAME failed: user_id is nil for player #{player_n}"
      end

      # Save the game to database (no deltas, just current state)
      result = try do
        Game.save_replay_to_db(game, user_id)
      rescue
        e ->
          reraise "SAVE_GAME failed while saving to database: #{Exception.message(e)}", __STACKTRACE__
      end

      # Log the result
      case result do
        {:ok, message} ->
          Logger.info("SAVE_GAME: #{message}")
        {:error, message} ->
          Logger.error("SAVE_GAME: #{message}")
      end

      # Return the game unchanged
      game
    rescue
      e ->
        # Re-raise with additional context if this is not already a wrapped error
        if String.starts_with?(Exception.message(e), "SAVE_GAME failed") do
          reraise e, __STACKTRACE__
        else
          reraise "SAVE_GAME failed with unexpected error: #{Exception.message(e)}", __STACKTRACE__
        end
    end
  end
end
