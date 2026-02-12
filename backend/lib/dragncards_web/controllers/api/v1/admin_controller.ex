defmodule DragnCardsWeb.API.V1.AdminController do
  use DragnCardsWeb, :controller
  alias DragnCards.Repo
  alias DragnCards.Users.User
  import Ecto.Query

  def update_user_patreon(conn, %{"alias" => user_alias} = params) do
    current_user = Pow.Plug.current_user(conn)

    cond do
      is_nil(current_user) ->
        conn
        |> put_status(401)
        |> json(%{error: %{message: "Not authenticated"}})

      !current_user.admin ->
        conn
        |> put_status(403)
        |> json(%{error: %{message: "Forbidden"}})

      true ->
        case Repo.one(from u in User, where: u.alias == ^user_alias) do
          nil ->
            conn
            |> put_status(404)
            |> json(%{error: %{message: "User not found with alias: #{user_alias}"}})

          user ->
            updates =
              %{}
              |> maybe_put(:supporter_level, params["supporter_level"])
              |> maybe_put(:patreon_member_id, params["patreon_member_id"])

            changeset = Ecto.Changeset.change(user, updates)

            case Repo.update(changeset) do
              {:ok, updated_user} ->
                json(conn, %{success: %{
                  message: "Updated user #{user_alias}",
                  supporter_level: updated_user.supporter_level,
                  patreon_member_id: updated_user.patreon_member_id
                }})

              {:error, _changeset} ->
                conn
                |> json(%{error: %{message: "Failed to update user"}})
            end
        end
    end
  end

  defp maybe_put(map, _key, nil), do: map
  defp maybe_put(map, _key, ""), do: map
  defp maybe_put(map, key, value), do: Map.put(map, key, value)
end
