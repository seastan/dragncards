defmodule DragnCardsGame.GameRegistry do
  @moduledoc """
  Keeps track of games.
  """
  require Logger
  alias DragnCardsGame.{GameUIServer}
  alias DragnCards.Rooms
  alias DragnCards.Rooms.Room

  @doc """
  add/2
  Register a GameUI.  We will create a Room in the database
  so it can be found in the lobby.
  """
  def add(game_name, %{}= gameui) do
    remove(game_name)

    gameui
    |> to_room_param()
    |> Rooms.create_room()
  end

  @doc """
  update/2
  Update information about a GameUI.  We will update the Room
  row in the database so it can found in the lobby.
  """
  def update(game_name, %{} = gameui) do
    room = Rooms.get_room_by_name(game_name)

    case room do
      %Room{} -> Rooms.update_room(room, to_room_param(gameui))
      _ -> nil
    end
  end

  @doc """
  remove/1
  Remove a GameUI.  We will delete the Room in the database.
  """
  def remove(game_name) do
    room = Rooms.get_room_by_name(game_name)

    case room do
      %Room{} -> Rooms.delete_room(room)
      _ -> nil
    end
  end

  # Convert a GameUI{} into a %{} that is suitable for
  # inserting or updating a Room.
  defp to_room_param(%{} = gameui) do
    %{
      slug: gameui["roomSlug"],
      name: gameui["roomSlug"],
      created_by: gameui["createdBy"],
      privacy_type: gameui["privacyType"],
      last_update: System.system_time(:second),
      num_players: gameui["game"]["numPlayers"],
      plugin_id: gameui["game"]["pluginId"]
    }
  end

  @doc """
  cleanup/0
  Find all Rooms in the database that don't currently have
  GameUIServers running for them, and delete them!
  Usually, GameUIServers run remove/1 when they terminate,
  but sometimes the server dies for other reasons.
  """
  def cleanup() do
    if Application.get_env(:dragncards, :cleanup_enabled, true) do
      Rooms.list_rooms()
      |> Enum.filter(fn room -> not GameUIServer.game_exists?(room.name) end)
      |> Enum.each(fn room ->
        Rooms.delete_room(room)
      end)
    end
  end
end
