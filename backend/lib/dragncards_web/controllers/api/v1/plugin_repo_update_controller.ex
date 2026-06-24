defmodule DragnCardsWeb.PluginRepoUpdateController do
  use DragnCardsWeb, :controller
  import Ecto.Query

  alias DragnCards.{Plugins.Plugin, Repo}
  alias DragnCardsWeb.RefreshPlugin
  alias DragnCards.Rooms

  # Match by plugin_id (used by the Discord bot)
  def update(conn, %{"plugin_id" => plugin_id_str, "file" => %Plug.Upload{path: path}}) do
    plugin_id = String.to_integer(plugin_id_str)
    IO.puts("Received files for plugin_id=#{plugin_id}, saved to #{path}")

    room_slugs_to_update =
      Rooms.list_rooms()
      |> Enum.filter(fn room -> room.plugin_id == plugin_id end)
      |> Enum.map(fn room -> room.slug end)

    IO.puts("Rooms to update: #{inspect(room_slugs_to_update)}")

    do_update(conn, path, room_slugs_to_update)
  end

  # Match by repo_url (used by other applications)
  def update(conn, %{"repo_url" => repo_url, "file" => %Plug.Upload{path: path}}) do
    IO.puts("Received files from #{repo_url} and saved to #{path}")

    open_rooms = Rooms.list_rooms()

    plugin_ids = Enum.map(open_rooms, fn room -> room.plugin_id end)

    plugin_urls = Enum.map(plugin_ids, fn plugin_id ->
      query = from p in Plugin, where: p.id == ^plugin_id, select: p.repo_url
      Repo.one(query)
    end)

    indices_where_url_matches = Enum.filter(0..(length(plugin_urls) - 1), fn i -> Enum.at(plugin_urls, i) == repo_url end)

    room_slugs_to_update = Enum.map(indices_where_url_matches, fn i -> Enum.at(open_rooms, i).slug end)

    IO.puts("Rooms to update: #{inspect(room_slugs_to_update)}")

    do_update(conn, path, room_slugs_to_update)
  end

  defp do_update(conn, path, room_slugs_to_update) do
    File.cp!(path, "/tmp/jsons.tar.gz")

    temp_json_dir = "/tmp/plugin_jsons"
    System.cmd("rm", ["-rf", temp_json_dir])
    System.cmd("mkdir", [temp_json_dir])

    case System.cmd("tar", ["-xzf", "/tmp/jsons.tar.gz", "-C", temp_json_dir]) do
      {_, 0} ->
        case RefreshPlugin.refresh() do
          {:ok, files} ->
            IO.puts("Broadcasting plugin_repo_update to rooms: #{inspect(room_slugs_to_update)}")
            Enum.each(room_slugs_to_update, fn room_slug ->
              IO.puts("Broadcasting to room: #{room_slug}")
              DragnCardsWeb.Endpoint.broadcast(
                "room:#{room_slug}",
                "plugin_repo_update",
                %{"files" => files}
              )
            end)
            send_resp(conn, :ok, "Files received and extracted successfully\n")
          {:error, error} ->
            send_resp(conn, :internal_server_error, error.message)
        end

      {error, _} ->
        send_resp(conn, :internal_server_error, "Failed to extract files: #{error}")
    end
  end

  def notify(conn, _params) do
    conn
    |> put_status(:bad_request)
    |> json(%{error: "Invalid parameters"})
  end





  # alias DragnCards.Rooms
  # alias DragnCards.Rooms.Room

  # # alias DragnCardsUtil.{NameGenerator, Slugify}
  # # alias DragnCardsGame.GameSupervisor

  # action_fallback DragnCardsWeb.FallbackController

  # def update(conn, _params) do
  #   IO.puts("----------------------------------------------------- open_rooms a")
  #   rooms = Rooms.list_rooms()
  #   IO.puts("----------------------------------------------------- open_rooms b")
  #   IO.inspect(rooms)
  #   IO.puts("----------------------------------------------------- open_rooms c")
  #   render(conn, "index.json", rooms: rooms)
  # end
end
