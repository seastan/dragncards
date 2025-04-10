defmodule DragnCardsWeb.MyPluginsController do
  use DragnCardsWeb, :controller
  import Ecto.Query

  alias DragnCards.{Plugins, Plugins.Plugin, Repo}
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


  # Update: Update plugin
  @spec delete(Conn.t(), map()) :: Conn.t()
  def delete(conn, %{"id" => plugin_id}) do
    user = Pow.Plug.current_user(conn)
    plugin = Repo.one(from p in Plugin, select: [:id], where: p.id == ^plugin_id)
    plugin_id = plugin.id
    user_id = user.id
    from(x in Plugin, where: x.id == ^plugin_id and x.author_id == ^user_id) |> Repo.delete_all
    conn
    |> json(%{success: %{message: "Updated settings"}})
  end
end
