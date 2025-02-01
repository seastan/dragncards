defmodule DragnCardsGame.Evaluate.Functions.SET_LAYOUT do
  alias DragnCardsGame.{Evaluate, PluginCache}
  alias DragnCards.Plugins
  @moduledoc """
  *Arguments*:
  1. `playerI` (string like "player1")
  2. `layoutId` (string matching a layout id in `gameDef.layouts`)

  Sets the layout of the given player to the layout with the given id. If `playerI` is "shared", the layout for all players and spectators is updated.

  The shared layout (visible to spectators) is found at `/layout` and the player-specific layout is found at `/playerData/playerI/layout`.

  The shared layout id is found at `/layoutId` and the player-specific layout id is found at `/playerData/playerI/layoutId`.

  *Returns*:
  (game state) The updated game state.
  """

  @doc """
  Executes the 'SET_LAYOUT' operation with the given arguments.

  ## Parameters

    - `args`: The arguments required for the 'SET_LAYOUT' operation.

  ## Returns

  The result of the 'SET_LAYOUT' operation.
  """
  def get_layout_from_game_def(plugin_id, layout_id) do
    game_def = PluginCache.get_game_def_cached(plugin_id)
    game_def["layouts"][layout_id]
  end

  def execute(game, code, trace) do
    player_i = Evaluate.evaluate(game, Enum.at(code, 1), trace ++ ["player_i"])
    layout_id = Evaluate.evaluate(game, Enum.at(code, 2), trace ++ ["layout_id"])
    layout = get_layout_from_game_def(game["options"]["pluginId"], layout_id)
    game = case player_i do
      "shared" ->
        # Update the shared layout
        game = game
        |> Evaluate.evaluate(["SET", "/layoutId", layout_id])
        |> Evaluate.evaluate(["SET", "/layout", layout])

        # Update the player layouts
        Enum.reduce(game["playerData"], game, fn({player_i, _player_data}, acc) ->
          acc
          |> Evaluate.evaluate(["SET", "/playerData/#{player_i}/layoutId", layout_id])
          |> Evaluate.evaluate(["SET", "/playerData/#{player_i}/layout", layout])
        end)
      _ ->
        game
        |> Evaluate.evaluate(["SET", "/playerData/#{player_i}/layoutId", layout_id])
        |> Evaluate.evaluate(["SET", "/playerData/#{player_i}/layout", layout])
    end
    if layout["postSetActionList"] do
      Evaluate.evaluate(game, ["ACTION_LIST", layout["postSetActionList"]], trace ++ ["postSetActionList"])
    else
      game
    end

  end


end
