  defmodule DragnCardsGame.Game do
  @moduledoc """
  Represents a game of dragncards.
  In early stages of the app, it only represents a
  some toy game used to test everything around it.
  """
  require Logger
  import Ecto.Query
  alias ElixirSense.Log
  alias DragnCardsGame.{Groups, Game, PlayerData, GameVariables, Evaluate, AutomationRules, TempTokens, PluginCache}
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
    replay = Repo.get_by(Replay, uuid: replay_uuid)

    if replay != nil and replay.game_json do
      %{
        game: replay.game_json,
        deltas: replay.deltas
      }
    else
      new_game(room_slug, user_id, game_def, options)
    end
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
      "loadList" => [],
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

  @doc """
  Saves the game replay to the database for a specific user.

  ## Parameters

    - `game`: The game state to save
    - `user_id`: The user ID to save the replay for
    - `deltas`: List of game deltas (defaults to [])

  ## Returns

  A tuple {:ok, message} or {:error, message}
  """
  def save_replay_to_db(game, user_id, deltas \\ []) do
    if user_id == nil do
      {:error, "Error saving game: user not recognized."}
    else
      game_uuid = game["id"]
      player_ids = extract_player_ids(game)

      # Look up by uuid only — one row per game
      {replay, creator_id} = case Repo.get_by(Replay, uuid: game_uuid) do
        nil  -> {%Replay{user_id: user_id, uuid: game_uuid}, user_id}
        existing -> {existing, existing.user_id}
      end

      # Trim deltas based on creator's supporter status
      trimmed_deltas = trim_saved_deltas(deltas, creator_id)

      game_def = PluginCache.get_game_def_cached(game["pluginId"])
      save_metadata = get_in(game_def, ["saveGame", "metadata"])

      updates = %{
        game_json: game,
        metadata: if save_metadata == nil do nil else Evaluate.evaluate(game, ["PROCESS_MAP", save_metadata], ["save_replay"]) end,
        plugin_id: game["pluginId"],
        deltas: trimmed_deltas,
        player_ids: player_ids,
      }

      result = replay
      |> Replay.changeset(updates)
      |> Repo.insert_or_update

      # Check if it worked
      case result do
        {:ok, _struct} ->
          Logger.debug("Insert or update was successful!")

        {:error, changeset} ->
          Logger.debug("An error occurred:")
          Logger.debug(inspect(changeset.errors))
      end

      case Users.get_replay_save_permission(creator_id) do
        true ->
          {:ok, "Full replay saved."}
        false ->
          {:ok, "Current game saved. To save full replays, become a supporter."}
      end
    end
  end

  defp extract_player_ids(game) do
    case game["playerData"] do
      nil -> []
      player_data ->
        player_data
        |> Enum.flat_map(fn {_seat, data} ->
          case data["user_id"] do
            nil -> []
            id when is_integer(id) -> [id]
            _ -> []
          end
        end)
        |> Enum.uniq()
    end
  end

  defp trim_saved_deltas(deltas, user_id) do
    save_full_replay = Users.get_replay_save_permission(user_id)

    if save_full_replay do
      deltas
    else
      start_index = if Enum.count(deltas) > 5 do
        Enum.count(deltas)-5
      else
        0
      end
      Enum.slice(deltas, start_index..-1)
    end
  end

end
