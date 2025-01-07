defmodule DragnCardsWeb.API.V1.ProfileController do
  use DragnCardsWeb, :controller
  alias DragnCards.{Users, Repo}
  alias DragnCards.Users.User
  alias Plug.Conn

  # Index: Get my own private profile.
  @spec index(Conn.t(), map()) :: Conn.t()
  def index(conn, _params) do
    user = Pow.Plug.current_user(conn)

    case user do
      nil ->
        conn
        |> put_status(401)
        |> json(%{error: %{code: 401, message: "Not authenticated"}})

      _ ->
        user = Users.get_user(user.id)
        json(conn, %{user_profile: User.to_my_profile(user)})
    end
  end

  # Show: Look up the public profile of another user.
  @spec show(Conn.t(), map()) :: Conn.t()
  def show(conn, %{"id" => user_id}) do
    user = Users.get_user(user_id)

    case user do
      nil ->
        conn
        |> put_status(404)
        |> json(%{error: %{code: 404, message: "Not Found"}})

      _ ->
        json(conn, %{user_profile: User.to_public_profile(user)})
    end
  end

  # Update: Update profile settings.
  @spec update(Conn.t(), map()) :: Conn.t()
  #def update(conn, %{"user" => user}) do
  def update(conn, %{"user" => user_params}) do
    user_id = user_params["id"]
    u = Repo.get!(User, user_id)
    updates = %{
      language: user_params["language"]
    }
    u = Ecto.Changeset.change(u, updates)
    case Repo.update(u) do
      {:ok, _struct}       -> # Updated with success
        #Pow.Plug.update_user(conn, %{}) # Refresh the session
        conn
        |> json(%{success: %{message: "Updated settings"}})
      {:error, _changeset} -> # Something went wrong
        conn
        |> json(%{success: %{message: "Failed to update settings"}})
    end
  end

  def update_plugin_user_settings(conn, nested_obj) do
    current_user = conn.assigns.current_user
    IO.puts "current_user: #{inspect(current_user)}"
    if current_user do
      user = Repo.get!(User, current_user.id)
      updates = User.settings_update(user, nested_obj)
      changeset = Ecto.Changeset.change(user, updates)
      IO.puts("changeset: #{inspect(changeset)}")

      case Repo.update(changeset) do
        {:ok, _user} ->
          Pow.Plug.update_user(conn, %{})
          conn
          |> json(%{success: %{message: "Updated user's plugin settings"}})
        {:error, changeset} ->
          conn
          |> json(%{error: %{message: "Failed to update user's plugin settings", changeset: changeset}})
      end
    else
      conn
      |> json(%{error: %{message: "User not authenticated"}})
    end
  end


end
