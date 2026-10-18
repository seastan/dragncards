defmodule DragnCardsWeb.API.V1.ProfileUpdateTest do
  @moduledoc """
  Authorization tests for POST /api/v1/profile/update.

  It used to be unauthenticated and took the user id from the request body,
  so anyone could change any user's settings.
  """
  use DragnCardsWeb.ConnCase

  alias DragnCards.Repo
  alias DragnCards.Users.User
  alias DragnCardsWeb.APIAuthPlug

  @pow_config [otp_app: :dragncards]

  defp make_user(email, alias_name) do
    %User{}
    |> User.changeset(%{
      email: email,
      password: "testpassword",
      password_confirmation: "testpassword",
      alias: alias_name
    })
    |> Repo.insert!()
  end

  defp sign_in(conn, user) do
    {signed_conn, _user} = APIAuthPlug.create(conn, user, @pow_config)
    :timer.sleep(100)
    Plug.Conn.put_req_header(conn, "authorization", signed_conn.private[:api_auth_token])
  end

  setup %{conn: conn} do
    user = make_user("user@example.com", "user")
    other = make_user("other@example.com", "other")
    {:ok, conn: conn, user: user, other: other, user_conn: sign_in(conn, user)}
  end

  test "requires a session", %{conn: conn, user: user} do
    assert conn
           |> post("/api/v1/profile/update", %{"user" => %{"id" => user.id, "language" => "French"}})
           |> json_response(401)

    assert Repo.get!(User, user.id).language == "English"
  end

  test "updates the signed-in user's language and timezone", %{user: user, user_conn: user_conn} do
    assert user_conn
           |> post("/api/v1/profile/update", %{"user" => %{"language" => "French", "timezone" => "Europe/Paris"}})
           |> json_response(200)

    updated = Repo.get!(User, user.id)
    assert updated.language == "French"
    assert updated.timezone == "Europe/Paris"
  end

  test "ignores a user id in the body", %{user: user, other: other, user_conn: user_conn} do
    post(user_conn, "/api/v1/profile/update", %{"user" => %{"id" => other.id, "language" => "German"}})

    assert Repo.get!(User, other.id).language == "English"
    assert Repo.get!(User, user.id).language == "German"
  end

  test "only changes the keys that were sent", %{user: user, user_conn: user_conn} do
    user |> Ecto.Changeset.change(timezone: "Asia/Tokyo") |> Repo.update!()
    post(user_conn, "/api/v1/profile/update", %{"user" => %{"language" => "Spanish"}})

    assert Repo.get!(User, user.id).timezone == "Asia/Tokyo"
  end

  test "can't set other fields like admin or supporter_level", %{user: user, user_conn: user_conn} do
    post(user_conn, "/api/v1/profile/update", %{"user" => %{"admin" => true, "supporter_level" => 10, "language" => "Italian"}})

    updated = Repo.get!(User, user.id)
    refute updated.admin
    assert updated.supporter_level in [nil, 0]
    assert updated.language == "Italian"
  end
end
