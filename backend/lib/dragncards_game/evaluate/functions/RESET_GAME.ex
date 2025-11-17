defmodule DragnCardsGame.Evaluate.Functions.RESET_GAME do
  require Logger
  alias DragnCardsGame.{Evaluate, Game, PluginCache}
  @moduledoc """
  *Arguments*:
  None

  Resets the current game to its initial state by creating a new game with the same
  room slug, user, plugin, and options as the current game.

  *Returns*:
  (game state) A fresh game state with all cards removed and all state reset.

  *Examples*:

  Reset the current game:
  ```
  ["RESET_GAME"]
  ```
  """

  @doc """
  Executes the 'RESET_GAME' operation.

  ## Parameters

    - `game`: The current game state
    - `code`: The code containing the function call
    - `trace`: The execution trace for debugging

  ## Returns

  A new game state created with the same configuration as the current game.
  """
  def execute(game, code, trace) do
    try do
      # Extract required parameters from current game
      room_slug = game["roomSlug"]
      player_n = Evaluate.evaluate(game, "$PLAYER_N", trace ++ ["player_n"])
      user_id = game["playerData"][player_n]["user_id"]
      options = game["options"]

      if room_slug == nil do
        raise "RESET_GAME failed: game[\"roomSlug\"] is nil"
      end

      if user_id == nil do
        raise "RESET_GAME failed: user_id is nil"
      end

      if options == nil do
        raise "RESET_GAME failed: game[\"options\"] is nil"
      end

      # Get the game definition from the plugin cache
      game_def = try do
        PluginCache.get_game_def_cached(game["pluginId"])
      rescue
        e ->
          reraise "RESET_GAME failed while loading game definition for plugin #{inspect(game["pluginId"])}: #{Exception.message(e)}", __STACKTRACE__
      end

      # Create a new game with the same configuration
      new_game = try do
        Game.new(room_slug, user_id, game_def, options)
      rescue
        e ->
          reraise "RESET_GAME failed while creating new game: #{Exception.message(e)}", __STACKTRACE__
      end

      if game_def["automation"]["postNewGameActionList"] != nil do
        new_game = Evaluate.evaluate(new_game, game_def["automation"]["postNewGameActionList"], trace ++ ["postNewGameActionList"])
      else
        new_game
      end

    rescue
      e ->
        # Re-raise with additional context if this is not already a wrapped error
        if String.starts_with?(Exception.message(e), "RESET_GAME failed") do
          reraise e, __STACKTRACE__
        else
          reraise "RESET_GAME failed with unexpected error: #{Exception.message(e)}", __STACKTRACE__
        end
    end
  end
end
