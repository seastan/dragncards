defmodule DragnCardsWeb.API.V1.UsersController do
  use DragnCardsWeb, :controller

  alias DragnCards.Repo
  alias DragnCards.Users.User
  alias DragnCards.UserPluginPermission
  alias DragnCards.Replay

  import Ecto.Query

  def fetch_all(conn, %{"user" => user_params}) do
    # Return a list of all users in the form of id, alias tuples
    query = from u in User, select: %{id: u.id, alias: u.alias}
    result = Repo.all(query)
    json(conn, %{data: result})
  end

  def fetch_plugin_permission(conn, %{"plugin_id" => plugin_id}) do
    IO.puts("fetch_plugin_permission 1")

    query = from u in User,
      left_join: upa in UserPluginPermission, on: upa.user_id == u.id and upa.private_access == ^plugin_id,
      select: %{user_id: u.id, user_alias: u.alias, private_access: not is_nil(upa.private_access)}

    result = Repo.all(query)
      |> Enum.into(%{}, fn %{user_id: user_id, user_alias: user_alias, private_access: private_access} -> {user_alias, %{private_access: private_access, user_id: user_id}} end)

    json(conn, %{data: result})
  end


  def add_plugin_permission(conn, %{"plugin_id" => plugin_id, "user_id" => user_id}) do
    IO.puts("set_plugin_permission 1")

    case UserPluginPermission.create_user_plugin_permission(user_id, plugin_id) do
      {:ok, message} ->
        conn
        |> json(%{success: %{message: message}})

      {:error, message} ->
        conn
        |> json(%{success: %{message: message}})
    end
  end

  def remove_plugin_permission(conn, %{"plugin_id" => plugin_id, "user_id" => user_id}) do

    case UserPluginPermission.delete_user_plugin_permission(user_id, plugin_id) do
      {:ok, message} ->
        conn
        |> json(%{success: %{message: message}})

      {:error, message} ->
        conn
        |> json(%{success: %{message: message}})
    end
  end

end
