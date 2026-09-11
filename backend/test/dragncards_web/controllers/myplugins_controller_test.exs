defmodule DragnCardsWeb.MyPluginsControllerTest do
  @moduledoc """
  Authorization tests for the plugin management endpoints.

  The delete/2 clause used to be written `%Plugin{author_id: user_id}` without a
  pin. In Elixir that *rebinds* user_id instead of comparing it, so the clause
  matched every plugin and any authenticated user could delete any plugin along
  with its decks, custom card DBs and permissions. These tests pin that down.
  """
  use DragnCardsWeb.ConnCase

  alias DragnCards.{Plugins, Plugins.Plugin, Repo}
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

  defp make_plugin(user, name) do
    {:ok, plugin} =
      Plugins.create_plugin(%{
        "name" => name,
        "author_id" => user.id,
        "game_def" => %{},
        "card_db" => %{},
        "public" => true
      })

    plugin
  end

  defp sign_in(conn, user) do
    {signed_conn, _user} = APIAuthPlug.create(conn, user, @pow_config)
    :timer.sleep(100)
    Plug.Conn.put_req_header(conn, "authorization", signed_conn.private[:api_auth_token])
  end

  setup %{conn: conn} do
    owner = make_user("owner@example.com", "owner")
    attacker = make_user("attacker@example.com", "attacker")
    plugin = make_plugin(owner, "owned plugin")

    {:ok,
     conn: conn,
     owner: owner,
     attacker: attacker,
     plugin: plugin,
     owner_conn: sign_in(conn, owner),
     attacker_conn: sign_in(conn, attacker)}
  end

  describe "delete" do
    test "another user cannot delete your plugin", ctx do
      conn = delete(ctx.attacker_conn, "/api/myplugins/#{ctx.plugin.id}")

      assert conn.status == 403
      assert Repo.get(Plugin, ctx.plugin.id), "plugin must still exist"
    end

    test "the author can delete their own plugin", ctx do
      conn = delete(ctx.owner_conn, "/api/myplugins/#{ctx.plugin.id}")

      assert conn.status == 200
      refute Repo.get(Plugin, ctx.plugin.id)
    end

    test "an anonymous request is rejected", ctx do
      conn = delete(ctx.conn, "/api/myplugins/#{ctx.plugin.id}")

      assert conn.status == 401
      assert Repo.get(Plugin, ctx.plugin.id)
    end
  end

  describe "update" do
    @update_body %{"plugin" => %{"name" => "renamed by attacker"}}

    test "another user cannot update your plugin", ctx do
      conn = patch(ctx.attacker_conn, "/api/myplugins/#{ctx.plugin.id}", @update_body)

      assert conn.status == 403
      assert Repo.get(Plugin, ctx.plugin.id).name == "owned plugin"
    end

    test "the author can update their own plugin", ctx do
      conn =
        patch(ctx.owner_conn, "/api/myplugins/#{ctx.plugin.id}", %{
          "plugin" => %{"name" => "renamed by owner"}
        })

      assert conn.status == 200
      assert Repo.get(Plugin, ctx.plugin.id).name == "renamed by owner"
    end

    test "ownership cannot be transferred via a client-supplied author_id", ctx do
      conn =
        patch(ctx.owner_conn, "/api/myplugins/#{ctx.plugin.id}", %{
          "plugin" => %{"name" => "still mine", "author_id" => ctx.attacker.id}
        })

      assert conn.status == 200
      assert Repo.get(Plugin, ctx.plugin.id).author_id == ctx.owner.id
    end

    test "an anonymous request is rejected", ctx do
      conn = patch(ctx.conn, "/api/myplugins/#{ctx.plugin.id}", @update_body)

      assert conn.status == 401
      assert Repo.get(Plugin, ctx.plugin.id).name == "owned plugin"
    end
  end

  describe "create" do
    test "author_id is taken from the session, not the request body", ctx do
      conn =
        post(ctx.attacker_conn, "/api/myplugins", %{
          "plugin" => %{
            "name" => "planted",
            "author_id" => ctx.owner.id,
            "game_def" => %{},
            "card_db" => %{},
            "public" => false
          }
        })

      assert conn.status == 200
      created = Repo.get_by!(Plugin, name: "planted")
      assert created.author_id == ctx.attacker.id
    end

    test "an anonymous request is rejected", ctx do
      conn =
        post(ctx.conn, "/api/myplugins", %{
          "plugin" => %{"name" => "anon", "game_def" => %{}, "card_db" => %{}, "public" => false}
        })

      assert conn.status == 401
      refute Repo.get_by(Plugin, name: "anon")
    end
  end

  describe "show" do
    test "only ever lists the caller's own plugins", ctx do
      make_plugin(ctx.attacker, "attacker plugin")

      # Ask for the owner's id while authenticated as the attacker.
      conn = get(ctx.attacker_conn, "/api/myplugins/#{ctx.owner.id}")

      assert conn.status == 200
      names = Jason.decode!(conn.resp_body)["my_plugins"] |> Enum.map(& &1["name"])
      assert names == ["attacker plugin"]
    end
  end
end
