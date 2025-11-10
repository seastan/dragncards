  defmodule DragnCardsGame.Game do
  @moduledoc """
  Represents a game of dragncards.
  In early stages of the app, it only represents a
  some toy game used to test everything around it.
  """
  require Logger
  import Ecto.Query
  alias ElixirSense.Log
  alias DragnCardsGame.{Groups, Game, PlayerData, GameVariables, Evaluate, AutomationRules, TempTokens}
  alias DragnCards.{Repo, Replay, Users, Plugins}

  @type t :: Map.t()

  @doc """
  Creates a game with specified options.
  """
  @spec load(String.t(), integer(), map(), map()) :: map()
  def load(room_slug, user_id, game_def, options) do
    Logger.debug("Loading Game")

    #game_data =
      case options["replayUuid"] do
        nil -> new_game(room_slug, user_id, game_def, options)
        replay_uuid -> load_replay_game(replay_uuid, room_slug, user_id, game_def, options)
      end

    # Refresh id if we don't want replay to be overwritten
    # put_in(game_data.game["id"], Ecto.UUID.generate())
  end

  defp new_game(room_slug, user_id, game_def, options) do
    %{
      game: Game.new(room_slug, user_id, game_def, options),
      deltas: []
    }
  end

  defp load_replay_game(replay_uuid, room_slug, user_id, game_def, options) do

    query =
      from(e in Replay,
        where: e.uuid == ^replay_uuid,
        order_by: [desc: e.inserted_at],
        limit: 1
      )

    replay = Repo.one(query)

    if replay.game_json do
      %{
        game: replay.game_json,
        deltas: replay.deltas
      }
    else
      new_game(room_slug, user_id, game_def, options)
    end

    # TODO: Set room name
  end

  def automation_action_lists(game_def) do
    # Delete the gameRules and cards keys from game_def["automation"]
    game_def["automation"]
    |> Map.delete("gameRules")
    |> Map.delete("cards")
  end

  @doc """
  new/2:  Create a game with specified options.
  """
  @spec new(String.t(), integer(), Map.t(), Map.t()) :: Game.t()
  def new(room_slug, user_id, game_def, options) do
    IO.puts("Making new Game")
    player_count_menu = game_def["playerCountMenu"]
    default_player_count_info = Enum.at(player_count_menu, 0)
    max_num_players =
      player_count_menu
      |> Enum.max_by(& &1["numPlayers"])
      |> Map.get("numPlayers")

    IO.inspect(default_player_count_info)
    layout_id = default_player_count_info["layoutId"]
    #IO.inspect(layout)
    groups = Groups.new(game_def)
    step_id =
      game_def
      |> Map.get("stepOrder", [])
      |> Enum.at(0, nil)
    plugin_id = options["pluginId"]
    plugin_version = Plugins.get_plugin_version(plugin_id)
    plugin_name = Plugins.get_plugin_name(plugin_id)
    IO.puts("Building base game structure")
    base = try do
    %{
      "id" => Ecto.UUID.generate,
      "roomSlug" => room_slug,
      "pluginId" => plugin_id,
      "pluginVersion" => plugin_version,
      "pluginName" => plugin_name,
      "numPlayers" => default_player_count_info["numPlayers"] || 1,
      "roundNumber" => 0,
      "layoutId" => layout_id,
      "layout" => game_def["layouts"][layout_id],
      "firstPlayer" => "player1",
      "stepId" => step_id,
      "groupById" => groups,
      "stackById" => %{},
      "cardById"  => %{},
      "tempTokens" => TempTokens.new(),
      "automationActionLists" => automation_action_lists(game_def),
      "automationEnabled" => true,
      "currentScopeIndex" => 0,
      "imageUrlPrefix" => game_def["imageUrlPrefix"],
      "options" => options,
      "loadedADeck" => false,
      "loadCardsHistory" => [],
      "loadedCardIds" => [],
      "variables" => GameVariables.default(),
      "functions" => game_def["functions"] || %{},
      "ruleById" => %{},
      "ruleMap" => %{},
      "messageByTimestamp" => %{},
      "messages" => [], # These messages will be delivered to the GameUi parent, which will then relay them to chat
      "fadeText" => nil
    }
    rescue
      e in KeyError ->
        IO.puts("Error: #{inspect(e)}")
      _ ->
        IO.puts("Error detected")
    end
    IO.puts("Made new Game")
    IO.inspect(max_num_players)

    # Add player data
    player_data = %{}
    player_data = Enum.reduce(1..max_num_players, player_data, fn(i, acc) ->
      player_i = "player#{i}"
      put_in(acc[player_i], PlayerData.new(game_def, player_i))
    end)
    IO.puts("Made player data")
    base = put_in(base["playerData"], player_data)

    # Add custom properties
    game = Enum.reduce(Map.get(game_def, "gameProperties", %{}), base, fn({key,val}, acc) ->
      put_in(acc[key], val["default"])
    end)
    Logger.debug("Made custom properties")

    # Add rules
    game = if is_map(game_def["automation"]["gameRules"]) do
      AutomationRules.implement_game_rules(game, game_def["automation"]["gameRules"])
    else
      game
    end

    # If the user has some default game settings, apply them
    user = Users.get_user(user_id)
    plugin_id = options["pluginId"]
    user_game_settings = user.plugin_settings["#{plugin_id}"]["game"]
    game = if user_game_settings != nil do
      Enum.reduce(user_game_settings, game, fn({key, val}, acc) ->
        put_in(acc, [key], val)
      end)
    else
      game
    end

    Logger.debug("Set game settings")
    game
  end

  def is_healthy(game) do
    if get_in(game,["cardById"]) == nil do
      IO.puts("Game is NOT healthy")
    else
      IO.puts("Game is healthy")
    end
  end

end
