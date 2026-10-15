defmodule DragnCardsWeb.ReplayController do
  use DragnCardsWeb, :controller
  import Ecto.Query

  alias DragnCards.{Replay, Repo, Users}
  alias DragnCards.Plugins.Plugin
  alias DragnCards.Users.User

  # alias DragnCardsUtil.{NameGenerator, Slugify}
  # alias DragnCardsGame.GameSupervisor

  action_fallback DragnCardsWeb.FallbackController

  # Saved games for the signed-in user. Non-supporters only get their three
  # most recent; the limit lives here so the full list never leaves the server.
  def index(conn, _params) do
    user = Pow.Plug.current_user(conn)
    query = from r in Replay,
      left_join: p in Plugin, on: p.id == r.plugin_id,
      order_by: [desc: r.updated_at],
      where: fragment("? = ANY(?)", ^user.id, r.player_ids) or r.user_id == ^user.id,
      where: not fragment("? = ANY(coalesce(?, '{}'::integer[]))", ^user.id, r.deleted_by),
      select: %{
        uuid: r.uuid,
        updated_at: r.updated_at,
        metadata: r.metadata,
        plugin_id: r.plugin_id,
        plugin_name: p.name,
        player_ids: r.player_ids
      }
    query = if Users.get_supporter_level(user.id) < 3, do: limit(query, 3), else: query
    replays = Repo.all(query)

    player_ids = replays |> Enum.flat_map(&(&1.player_ids || [])) |> Enum.uniq()
    aliases = Repo.all(from u in User, where: u.id in ^player_ids, select: {u.id, u.alias}) |> Map.new()
    replays = Enum.map(replays, fn r ->
      Map.put(r, :player_aliases, (r.player_ids || []) |> Enum.map(&aliases[&1]) |> Enum.reject(&is_nil/1))
    end)

    render(conn, "index.json", replays: replays)
  end

  # Hide a saved game from the signed-in user. Other players keep seeing it.
  @spec delete(Conn.t(), Map.t()) :: Conn.t()
  def delete(conn, %{"uuid" => uuid}) do
    user = Pow.Plug.current_user(conn)
    case Repo.get_by(Replay, uuid: uuid) do
      nil ->
        conn |> put_status(404) |> json(%{error: %{message: "Saved game not found"}})

      replay ->
        if replay.user_id == user.id or user.id in (replay.player_ids || []) do
          # Append in the database so concurrent deletes by different players
          # don't overwrite each other.
          from(r in Replay,
            where: r.id == ^replay.id,
            where: not fragment("? = ANY(coalesce(?, '{}'::integer[]))", ^user.id, r.deleted_by),
            update: [push: [deleted_by: ^user.id]]
          )
          |> Repo.update_all([])
          json(conn, %{success: %{message: "Deleted replay"}})
        else
          conn |> put_status(403) |> json(%{error: %{message: "Forbidden"}})
        end
    end
  end

  # def show(conn, %{"id" => id}) do
  #   room = Rooms.get_room!(id)
  #   render(conn, "show.json", room: room)
  # end

  # def update(conn, %{"id" => id, "room" => room_params}) do
  #   room = Rooms.get_room!(id)

  #   with {:ok, %Room{} = room} <- Rooms.update_room(room, room_params) do
  #     render(conn, "show.json", room: room)
  #   end
  # end

  # def delete(conn, %{"id" => id}) do
  #   room = Rooms.get_room!(id)

  #   with {:ok, %Room{}} <- Rooms.delete_room(room) do
  #     send_resp(conn, :no_content, "")
  #   end
  # end
end
