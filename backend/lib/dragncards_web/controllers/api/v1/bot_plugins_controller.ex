defmodule DragnCardsWeb.BotPluginsController do
  @moduledoc """
  Lets the Discord bug-fix bot push a plugin's game definition to this server.

  The bot has no user session, so it authenticates with a shared secret, the
  BOT_API_KEY environment variable, sent in the `x-bot-key` header. The key is
  deliberately narrow: it can replace `game_def` on an existing plugin and
  nothing else. It cannot create or delete plugins, change ownership, or touch
  any other field. If BOT_API_KEY is unset or empty the endpoint refuses every
  request.
  """
  use DragnCardsWeb, :controller

  alias DragnCards.{Plugins, Plugins.Plugin, Repo}
  alias DragnCardsGame.PluginCache

  def update(conn, %{"id" => plugin_id, "plugin" => %{"game_def" => game_def}})
      when is_map(game_def) do
    if authorized?(conn) do
      case Repo.get(Plugin, plugin_id) do
        nil ->
          conn |> put_status(:not_found) |> json(%{error: "Plugin not found"})

        plugin ->
          case Plugins.update_plugin(plugin, %{"game_def" => game_def}) do
            {:ok, plugin} ->
              PluginCache.refresh_plugin(plugin.id)
              json(conn, %{success: %{message: "Plugin updated successfully"}})

            {:error, _changeset} ->
              conn |> put_status(:unprocessable_entity) |> json(%{error: "Plugin update failed"})
          end
      end
    else
      conn
      |> put_status(:unauthorized)
      |> json(%{error: %{code: 401, message: "Invalid or missing bot key"}})
    end
  end

  def update(conn, _params) do
    conn |> put_status(:bad_request) |> json(%{error: "Expected plugin.game_def object"})
  end

  defp authorized?(conn) do
    expected = System.get_env("BOT_API_KEY")

    case {expected, get_req_header(conn, "x-bot-key")} do
      {key, [given]} when is_binary(key) and key != "" ->
        Plug.Crypto.secure_compare(given, key)

      _ ->
        false
    end
  end
end
