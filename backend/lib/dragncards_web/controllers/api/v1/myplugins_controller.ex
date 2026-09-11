defmodule DragnCardsWeb.MyPluginsController do
  use DragnCardsWeb, :controller
  import Ecto.Query

  alias DragnCards.{Plugins, Plugins.Plugin, Repo, UserPluginPermission, Rooms.RoomLog, Decks.Deck, Plugins.CustomCardDb}
  alias DragnCardsGame.PluginCache

  action_fallback DragnCardsWeb.FallbackController

  # Every action in here mutates or exposes a plugin, so every action is
  # author-only. Note that UserPluginPermission grants *view* access to a private
  # plugin (see Plugins.list_plugins_info/1); it is not an edit grant.

  # Index of the caller's own plugins. The :id path segment is a user id, but it
  # is ignored: you only ever get your own list.
  def show(conn, _params) do
    case Pow.Plug.current_user(conn) do
      nil ->
        unauthenticated(conn)

      user ->
        query =
          from(Plugin,
            order_by: [desc: :updated_at],
            where: [author_id: ^user.id],
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
          )

        my_plugins =
          query
          |> Repo.all()
          |> Enum.map(&(&1 |> Map.from_struct() |> Map.delete(:__meta__)))

        json(conn, %{my_plugins: my_plugins})
    end
  end

  # Create: Create plugin
  @spec create(Conn.t(), map()) :: Conn.t()
  def create(conn, %{"plugin" => plugin_params}) do
    case Pow.Plug.current_user(conn) do
      nil ->
        unauthenticated(conn)

      user ->
        # The client sends author_id, but never trust it: the author is whoever
        # is holding the session.
        params = Map.put(plugin_params, "author_id", user.id)

        case Plugins.create_plugin(params) do
          {:ok, plugin} ->
            json(conn, %{success: %{message: "Plugin created successfully"}, plugin: plugin})

          {:error, _changeset} ->
            json(conn, %{error: %{message: "Plugin creation failed"}})
        end
    end
  end

  # Update: Update plugin
  @spec update(Conn.t(), map()) :: Conn.t()
  def update(conn, %{"id" => plugin_id, "plugin" => plugin_params}) do
    case Pow.Plug.current_user(conn) do
      nil -> unauthenticated(conn)
      user -> do_update(conn, user.id, plugin_id, plugin_params)
    end
  end

  defp do_update(conn, user_id, plugin_id, plugin_params) do
    case Repo.get(Plugin, plugin_id) do
      nil ->
        conn
        |> put_status(:not_found)
        |> json(%{error: "Plugin not found"})

      %Plugin{author_id: author_id} when author_id != user_id ->
        forbidden(conn, "You are not authorized to edit this plugin")

      plugin ->
        # Drop any client-supplied author_id so ownership can't be transferred.
        params = Map.drop(plugin_params, ["author_id", "id"])

        case Plugins.update_plugin(plugin, params) do
          {:ok, plugin} ->
            PluginCache.refresh_plugin(plugin.id)
            json(conn, %{success: %{message: "Plugin updated successfully"}, plugin: plugin})

          {:error, _changeset} ->
            json(conn, %{error: %{message: "Plugin update failed"}})
        end
    end
  end

  @spec delete(Conn.t(), map()) :: Conn.t()
  def delete(conn, %{"id" => plugin_id}) do
    case Pow.Plug.current_user(conn) do
      nil -> unauthenticated(conn)
      user -> do_delete(conn, user.id, plugin_id)
    end
  end

  defp do_delete(conn, user_id, plugin_id) do
    case Repo.get(Plugin, plugin_id) do
      nil ->
        conn
        |> put_status(:not_found)
        |> json(%{error: "Plugin not found"})

      # NOTE: ^user_id MUST be pinned. Without the pin this clause matches every
      # plugin and rebinds user_id to the plugin's own author, which let any
      # authenticated user delete any plugin. (A variable bound in the same
      # pattern cannot be pinned, which is why user_id is passed in.)
      %Plugin{id: id, author_id: ^user_id} ->
        Repo.delete_all(from(upp in UserPluginPermission, where: upp.private_access == ^id))
        Repo.delete_all(from(rl in RoomLog, where: rl.plugin_id == ^id))
        Repo.delete_all(from(d in Deck, where: d.plugin_id == ^id))
        Repo.delete_all(from(c in CustomCardDb, where: c.plugin_id == ^id))
        Repo.delete_all(from(p in Plugin, where: p.id == ^id and p.author_id == ^user_id))

        json(conn, %{success: %{message: "Plugin deleted"}})

      %Plugin{} ->
        forbidden(conn, "You are not authorized to delete this plugin")
    end
  end

  defp unauthenticated(conn) do
    conn
    |> put_status(:unauthorized)
    |> json(%{error: %{code: 401, message: "Not authenticated"}})
  end

  defp forbidden(conn, message) do
    conn
    |> put_status(:forbidden)
    |> json(%{error: message})
  end
end
