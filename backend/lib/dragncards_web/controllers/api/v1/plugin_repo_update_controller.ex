defmodule DragnCardsWeb.PluginRepoUpdateController do
  use DragnCardsWeb, :controller
  import Ecto.Query

  alias DragnCards.{Plugins, Plugins.Plugin, Repo}
  alias DragnCardsWeb.RefreshPlugin
  alias DragnCards.Rooms
  alias Phoenix.PubSub

  def update(conn, %{"repo_url" => repo_url, "file" => %Plug.Upload{path: path}}) do
    IO.puts(
      "Received files from #{repo_url} and saved to #{path}"
    )

    open_rooms = Rooms.list_rooms()

    IO.puts("Open rooms: #{inspect(open_rooms)}")

    # Get list of plugin_id for open rooms
    plugin_ids = Enum.map(open_rooms, fn room -> room.plugin_id end)

    # Query database for the Plugin.repo_url for each plugin_id
    plugin_urls = Enum.map(plugin_ids, fn plugin_id ->
      query = from p in Plugin, where: p.id == ^plugin_id, select: p.repo_url
      Repo.one(query)
    end)
    # Print repo_url
    IO.puts("Repo URLs: #{inspect(repo_url)}")
    # Print plugin_urls
    IO.puts("Plugin URLs: #{inspect(plugin_urls)}")

    indices_where_url_matches = Enum.filter(0..(length(plugin_urls) - 1), fn i -> Enum.at(plugin_urls, i) == repo_url end)

    room_slugs_to_update = Enum.map(indices_where_url_matches, fn i -> Enum.at(open_rooms, i).slug end)

    File.cp!(path, "/tmp/jsons.tar.gz")

    temp_json_dir = "/tmp/plugin_jsons"

    # Delete the existing files
    System.cmd("rm", ["-rf", temp_json_dir])

    # Create a new directory to extract the files
    System.cmd("mkdir", [temp_json_dir])

    # Extract the files
    case System.cmd("tar", ["-xzf", "/tmp/jsons.tar.gz", "-C", temp_json_dir]) do
      {_, 0} ->
        # Trigger the processing of the JSON files
        case RefreshPlugin.refresh() do
          {:ok, files} ->
            # Broadcast update message to relevant rooms
            IO.puts("Broadcasting plugin_repo_update to rooms: #{inspect(room_slugs_to_update)}")
            #IO.inspect(files)
            Enum.each(room_slugs_to_update, fn room_slug ->
              IO.puts("Broadcasting to room: #{room_slug}")
              PubSub.broadcast(DragnCards.PubSub, "room:#{room_slug}", {:plugin_repo_update, "files"})
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
