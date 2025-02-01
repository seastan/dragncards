defmodule DragnCards.Rooms do
  @moduledoc """
  The Rooms context.
  """

  import Ecto.Query, warn: false
  alias DragnCards.Repo

  alias DragnCards.Rooms.{Room, RoomLog}
  alias DragnCardsWeb.Endpoint

  @doc """
  Returns the list of rooms.

  ## Examples

      iex> list_rooms()
      [%Room{}, ...]

  """
  def list_rooms do
    Repo.all(Room)
  end

  @doc """
  Gets a single room by id.
  Raises `Ecto.NoResultsError` if the Room does not exist.

  ## Examples

      iex> get_room!(123)
      %Room{}

      iex> get_room!(456)
      ** (Ecto.NoResultsError)

  """
  def get_room!(id), do: Repo.get!(Room, id)

  def get_room_by_name(name) do
    Room
    |> Repo.get_by(name: name)
  end

  @doc """
  Creates a room.

  ## Examples

      iex> create_room(%{field: value})
      {:ok, %Room{}}

      iex> create_room(%{field: bad_value})
      {:error, %Ecto.Changeset{}}

  """
  def create_room(attrs \\ %{}) do
    IO.puts("Creating room")
    IO.inspect(attrs)
    room_log_changeset = %{
      creator_id: attrs[:created_by],
      plugin_id: attrs[:plugin_id]
    }
    IO.puts("Room log changeset")
    IO.inspect(room_log_changeset)

    new_room_log = %RoomLog{}
    |> RoomLog.changeset(room_log_changeset)

    try do
      Repo.insert!(new_room_log)
    rescue
      e ->
        IO.puts("Error creating room log")
        IO.inspect(e)
    end

    %Room{}
    |> Room.changeset(attrs)
    |> Repo.insert()
    |> notify_lobby()
  end


  @doc """
  Updates a room.

  ## Examples

      iex> update_room(room, %{field: new_value})
      {:ok, %Room{}}

      iex> update_room(room, %{field: bad_value})
      {:error, %Ecto.Changeset{}}

  """
  def update_room(%Room{} = room, attrs) do
    room
    |> Room.changeset(attrs)
    |> Repo.update()
    |> notify_lobby()
  end

  def update_room_name_by_slug(slug, name) do
    Room
    |> where([r], r.slug == ^slug)
    |> Repo.update_all(set: [name: name])
  end

  @doc """
  Deletes a Room.

  ## Examples

      iex> delete_room(room)
      {:ok, %Room{}}

      iex> delete_room(room)
      {:error, %Ecto.Changeset{}}

  """
  def delete_room(%Room{} = room) do
    Repo.delete(room)
    |> notify_lobby()
  end

  @doc """
  Returns an `%Ecto.Changeset{}` for tracking room changes.

  ## Examples

      iex> change_room(room)
      %Ecto.Changeset{source: %Room{}}

  """
  def change_room(%Room{} = room) do
    Room.changeset(room, %{})
  end

  ## This is a low quality temporary function
  def temp_delete_all() do
    list_rooms() |> Enum.map(fn x -> delete_room(x) end)
  end

  ## Notify_lobby:
  ## After making a successful change to a room,
  ## send the message "rooms_update"
  ## to the "lobby:lobby" channel
  defp notify_lobby({:ok, x}) do
    Endpoint.broadcast!("lobby:lobby", "rooms_update", %{rooms: list_rooms()})
    {:ok, x}
  end

  defp notify_lobby(x), do: x
end
