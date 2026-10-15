defmodule DragnCardsWeb.ReplayControllerTest do
  @moduledoc """
  Authorization tests for the saved games endpoints.

  These used to be unauthenticated: anyone could list any user's saved games by
  id, the three-game limit for non-supporters was only applied in the browser,
  and delete trusted the user id and deleted_by list sent in the request body.
  """
  use DragnCardsWeb.ConnCase

  alias DragnCards.{Replay, Repo}
  alias DragnCards.Users.User
  alias DragnCardsWeb.APIAuthPlug

  @pow_config [otp_app: :dragncards]

  defp make_user(email, alias_name, supporter_level \\ nil) do
    %User{}
    |> User.changeset(%{
      email: email,
      password: "testpassword",
      password_confirmation: "testpassword",
      alias: alias_name
    })
    |> Repo.insert!()
    |> Ecto.Changeset.change(supporter_level: supporter_level)
    |> Repo.update!()
  end

  defp make_replay(uuid, player_ids, minutes_ago \\ 0) do
    updated_at =
      NaiveDateTime.utc_now()
      |> NaiveDateTime.add(-minutes_ago * 60)
      |> NaiveDateTime.truncate(:second)

    Repo.insert!(%Replay{
      uuid: uuid,
      user_id: hd(player_ids),
      player_ids: player_ids,
      metadata: %{},
      game_json: %{},
      plugin_id: 1,
      inserted_at: updated_at,
      updated_at: updated_at
    })
  end

  defp sign_in(conn, user) do
    {signed_conn, _user} = APIAuthPlug.create(conn, user, @pow_config)
    :timer.sleep(100)
    Plug.Conn.put_req_header(conn, "authorization", signed_conn.private[:api_auth_token])
  end

  defp uuids(conn), do: json_response(conn, 200)["data"] |> Enum.map(& &1["uuid"])

  setup %{conn: conn} do
    player = make_user("player@example.com", "player")
    teammate = make_user("teammate@example.com", "teammate")
    stranger = make_user("stranger@example.com", "stranger")

    {:ok,
     conn: conn,
     player: player,
     teammate: teammate,
     player_conn: sign_in(conn, player),
     teammate_conn: sign_in(conn, teammate),
     stranger_conn: sign_in(conn, stranger)}
  end

  describe "index" do
    test "requires a session", %{conn: conn} do
      assert conn |> get("/api/replays") |> json_response(401)
    end

    test "returns only the signed-in user's games", %{player: player, player_conn: player_conn, stranger_conn: stranger_conn} do
      make_replay("mine", [player.id])

      assert uuids(get(player_conn, "/api/replays")) == ["mine"]
      assert uuids(get(stranger_conn, "/api/replays")) == []
    end

    test "limits non-supporters to their three most recent games", %{player: player, player_conn: player_conn} do
      for i <- 1..5, do: make_replay("game#{i}", [player.id], i)

      assert uuids(get(player_conn, "/api/replays")) == ["game1", "game2", "game3"]
    end

    test "returns every game to supporters", %{conn: conn} do
      supporter = make_user("supporter@example.com", "supporter", 3)
      for i <- 1..5, do: make_replay("game#{i}", [supporter.id], i)

      assert length(uuids(get(sign_in(conn, supporter), "/api/replays"))) == 5
    end

    test "deleted games don't count toward the limit", %{player: player, player_conn: player_conn} do
      for i <- 1..4, do: make_replay("game#{i}", [player.id], i)
      delete(player_conn, "/api/replays/game1")

      assert uuids(get(player_conn, "/api/replays")) == ["game2", "game3", "game4"]
    end
  end

  test "includes plugin name, player aliases and a UTC timestamp", %{player: player, teammate: teammate, player_conn: player_conn} do
    {:ok, plugin} =
      DragnCards.Plugins.create_plugin(%{
        "name" => "Test Plugin",
        "author_id" => player.id,
        "game_def" => %{},
        "card_db" => %{},
        "public" => true
      })

    make_replay("game", [player.id, teammate.id])
    |> Ecto.Changeset.change(plugin_id: plugin.id)
    |> Repo.update!()

    [row] = json_response(get(player_conn, "/api/replays"), 200)["data"]
    assert row["plugin_name"] == "Test Plugin"
    assert row["player_aliases"] == ["player", "teammate"]
    assert String.ends_with?(row["updated_at"], "Z")
  end

  describe "delete" do
    test "requires a session", %{conn: conn, player: player} do
      make_replay("game", [player.id])

      assert conn |> delete("/api/replays/game") |> json_response(401)
      assert Repo.get_by!(Replay, uuid: "game").deleted_by == nil
    end

    test "a stranger can't hide someone else's game", %{player: player, stranger_conn: stranger_conn} do
      make_replay("game", [player.id])

      assert stranger_conn |> delete("/api/replays/game") |> json_response(403)
      assert Repo.get_by!(Replay, uuid: "game").deleted_by == nil
    end

    test "hides the game only for the player who deleted it", %{player: player, teammate: teammate, player_conn: player_conn, teammate_conn: teammate_conn} do
      make_replay("game", [player.id, teammate.id])

      assert player_conn |> delete("/api/replays/game") |> json_response(200)
      assert uuids(get(player_conn, "/api/replays")) == []
      assert uuids(get(teammate_conn, "/api/replays")) == ["game"]
    end

    test "deleting twice doesn't duplicate the entry", %{player: player, player_conn: player_conn} do
      make_replay("game", [player.id])
      delete(player_conn, "/api/replays/game")
      delete(player_conn, "/api/replays/game")

      assert Repo.get_by!(Replay, uuid: "game").deleted_by == [player.id]
    end

    test "ignores a deleted_by list sent by the client", %{player: player, teammate: teammate, player_conn: player_conn} do
      make_replay("game", [player.id, teammate.id])
      |> Ecto.Changeset.change(deleted_by: [teammate.id])
      |> Repo.update!()

      delete(player_conn, "/api/replays/game", %{"replay" => %{"deleted_by" => []}})

      assert Repo.get_by!(Replay, uuid: "game").deleted_by == [teammate.id, player.id]
    end

    test "returns 404 for an unknown game", %{player_conn: player_conn} do
      assert player_conn |> delete("/api/replays/nope") |> json_response(404)
    end
  end
end
