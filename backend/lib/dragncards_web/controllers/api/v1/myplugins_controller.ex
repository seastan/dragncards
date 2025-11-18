defmodule DragnCardsWeb.MyPluginsController do
  use DragnCardsWeb, :controller
  import Ecto.Query

  alias DragnCards.{Plugins, Plugins.Plugin, Repo, UserPluginPermission, Rooms.RoomLog, Decks.Deck, Plugins.CustomCardDb}
  alias DragnCardsGame.PluginCache

  action_fallback DragnCardsWeb.FallbackController

  def show(conn, %{"id" => user_id}) do
    IO.inspect(conn)
    # Faster to gather all columns except game_json

    my_plugins = if user_id != nil and user_id != "undefined" do
      query = from Plugin,
        order_by: [desc: :updated_at],
        where: [author_id: ^user_id],
         select: [
          :id,
          :author_id,
          :name,
          :version,
          :num_favorites,
          :public,
          :inserted_at,
          :updated_at,
          :repo_url
        ]
      Repo.all(query)
    else
      []
    end
    #IO.inspect(my_plugins)
    my_plugins = Enum.reduce(my_plugins, [], fn(plugin, acc) ->
      acc ++ [Map.from_struct(plugin) |> Map.delete(:__meta__)]
    end)
    json(conn, %{my_plugins: my_plugins})
  end

  # Create: Create plugin
  @spec create(Conn.t(), map()) :: Conn.t()
  #def create(conn, %{"user" => user}) do
  def create(conn, %{"plugin" => plugin_params}) do
    case Plugins.create_plugin(plugin_params) do
      {:ok, plugin} ->
        conn
        |> json(%{success: %{message: "Plugin created successfully"}, plugin: plugin})
      {:error, _changeset} ->
        conn
        |> json(%{error: %{message: "Plugin creation failed"}})
    end
  end


  # Update: Update plugin
  @spec update(Conn.t(), map()) :: Conn.t()
  def update(conn, %{"plugin" => plugin_params}) do
    plugin_id = plugin_params["id"]
    plugin = Plugins.get_plugin!(plugin_id)
    case Plugins.update_plugin(plugin, plugin_params) do
      {:ok, plugin} ->
        PluginCache.refresh_plugin(plugin_id)
        conn
        |> json(%{success: %{message: "Plugin updated successfully"}, plugin: plugin})
      {:error, _changeset} ->
        conn
        |> json(%{error: %{message: "Plugin update failed"}})
      end
  end


  @spec delete(Conn.t(), map()) :: Conn.t()
  def delete(conn, %{"id" => plugin_id}) do
    user = Pow.Plug.current_user(conn)
    user_id = user.id
    res = Repo.get(Plugin, plugin_id)

    # Fetch plugin and check it exists
    case Repo.get(Plugin, plugin_id) do
      nil ->
        IO.puts("Plugin not found")
        conn
        |> put_status(:not_found)
        |> json(%{error: "Plugin not found"})

      %Plugin{id: plugin_id, author_id: user_id} ->

        # Manually delete related permissions first
        Repo.delete_all(from upp in UserPluginPermission, where: upp.private_access == ^plugin_id)
        Repo.delete_all(from rl in RoomLog, where: rl.plugin_id == ^plugin_id)
        Repo.delete_all(from d in Deck, where: d.plugin_id == ^plugin_id)
        Repo.delete_all(from c in CustomCardDb, where: c.plugin_id == ^plugin_id)

        # Now delete the plugin itself
        Repo.delete_all(from p in Plugin, where: p.id == ^plugin_id and p.author_id == ^user_id)

        conn
        |> json(%{success: %{message: "Plugin deleted"}})

      %Plugin{author_id: other_user_id} ->
        conn
        |> put_status(:forbidden)
        |> json(%{error: "You are not authorized to delete this plugin"})
    end
  end

end
