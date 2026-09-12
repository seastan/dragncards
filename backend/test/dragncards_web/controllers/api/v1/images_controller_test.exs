defmodule DragnCardsWeb.API.V1.ImagesControllerTest do
  use DragnCardsWeb.ConnCase, async: false

  alias DragnCards.Images
  alias DragnCards.Images.{Paths, Quota}
  alias DragnCards.{Repo, Users.User}
  alias DragnCardsWeb.APIAuthPlug

  @pow_config [otp_app: :dragncards]
  @fixtures Path.expand("../../../../support/fixtures/images", __DIR__)

  setup %{conn: conn} do
    root = Path.join(System.tmp_dir!(), "ctrl_uploads_#{System.unique_integer([:positive])}")
    File.mkdir_p!(Path.join(root, "u"))

    previous = Application.get_env(:dragncards, :uploads)
    Application.put_env(:dragncards, :uploads, Keyword.put(previous, :root, root))

    on_exit(fn ->
      Application.put_env(:dragncards, :uploads, previous)
      File.rm_rf(root)
    end)

    owner = make_user("owner@example.com", "owner")
    other = make_user("other@example.com", "other")

    %{
      conn: conn,
      root: root,
      owner: owner,
      other: other,
      owner_conn: sign_in(conn, owner),
      other_conn: sign_in(conn, other)
    }
  end

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
    {signed, _user} = APIAuthPlug.create(conn, user, @pow_config)
    :timer.sleep(100)
    Plug.Conn.put_req_header(conn, "authorization", signed.private[:api_auth_token])
  end

  defp fixture(name), do: Path.join(@fixtures, name)

  defp upload_plug(name) do
    %Plug.Upload{path: fixture(name), filename: name, content_type: "image/png"}
  end

  defp post_upload(conn, files, opts \\ []) do
    base = %{
      "profile" => Keyword.get(opts, :profile, "cards"),
      "count" => to_string(length(files))
    }

    base = if root = Keyword.get(opts, :root), do: Map.put(base, "root", root), else: base

    params =
      files
      |> Enum.with_index()
      |> Enum.reduce(base, fn {{fixture_name, dest}, i}, acc ->
        acc
        |> Map.put("file_#{i}", upload_plug(fixture_name))
        |> Map.put("path_#{i}", dest)
      end)

    post(conn, "/api/v1/images/upload", params)
  end

  defp seed(user, rel, source \\ "card.png") do
    {:ok, image} = Images.ingest(user.id, rel, "cards", fixture(source))
    image
  end

  describe "authentication" do
    test "every endpoint refuses an anonymous caller", %{conn: conn} do
      assert json_response(get(conn, "/api/v1/images"), 401)
      assert json_response(get(conn, "/api/v1/images/tree"), 401)
      assert json_response(get(conn, "/api/v1/images/quota"), 401)
      assert json_response(post(conn, "/api/v1/images/delete", %{"ids" => []}), 401)
      assert json_response(post(conn, "/api/v1/images/move", %{"id" => 1, "path" => "a.png"}), 401)
      assert json_response(delete(conn, "/api/v1/images/1"), 401)
    end
  end

  describe "POST /images/upload" do
    test "stores a file and reports it per-file", %{owner_conn: conn, owner: owner} do
      response = conn |> post_upload([{"card.png", "mygame/English/aragorn.png"}]) |> json_response(200)

      assert [result] = response["results"]
      assert result["status"] == "ok"
      assert result["path"] == "mygame/English/aragorn.webp"
      assert result["width"] == 123
      assert result["url"] =~ "/u/#{owner.id}/mygame/English/aragorn.webp"
      assert response["quota"]["image_count"] == 1
      assert File.exists?(Paths.abs_path!(owner.id, "mygame/English/aragorn.webp"))
    end

    test "preserves subpaths across a batch, which is how languages work", %{owner_conn: conn} do
      response =
        conn
        |> post_upload([
          {"card.png", "mygame/English/a.png"},
          {"photo.jpg", "mygame/Spanish/a.png"},
          {"tiny_ok.png", "mygame/English/b.png"}
        ])
        |> json_response(200)

      paths = response["results"] |> Enum.map(& &1["path"]) |> Enum.sort()

      assert paths == [
               "mygame/English/a.webp",
               "mygame/English/b.webp",
               "mygame/Spanish/a.webp"
             ]
    end

    test "applies the root prefix", %{owner_conn: conn} do
      response =
        conn
        |> post_upload([{"card.png", "English/a.png"}], root: "mygame")
        |> json_response(200)

      assert [%{"path" => "mygame/English/a.webp"}] = response["results"]
    end

    test "one bad file does not sink the batch", %{owner_conn: conn} do
      response =
        conn
        |> post_upload([
          {"card.png", "good.png"},
          {"svg_as.png", "evil.png"},
          {"tiny_ok.png", "alsogood.png"}
        ])
        |> json_response(200)

      by_index = Map.new(response["results"], &{&1["index"], &1})
      assert by_index[0]["status"] == "ok"
      assert by_index[1]["status"] == "error"
      assert by_index[1]["error"] =~ "Unsupported image format"
      assert by_index[2]["status"] == "ok"
      assert response["quota"]["image_count"] == 2
    end

    test "reports a traversal attempt against that file only", %{owner_conn: conn, owner: owner} do
      response =
        conn
        |> post_upload([{"card.png", "../../../../tmp/pwn.png"}])
        |> json_response(200)

      assert [%{"status" => "error", "error" => error}] = response["results"]
      assert error =~ "'..'"
      assert Images.list(owner.id) == []
    end

    test "refuses a batch larger than the per-request cap", %{owner_conn: conn} do
      files = for n <- 1..41, do: {"tiny_ok.png", "f#{n}.png"}
      response = conn |> post_upload(files) |> json_response(422)
      assert response["error"]["message"] =~ "the limit is 40"
    end

    test "refuses an unknown profile", %{owner_conn: conn} do
      response =
        conn |> post_upload([{"card.png", "a.png"}], profile: "enormous") |> json_response(422)

      assert response["error"]["message"] =~ "Unknown image profile"
    end

    test "refuses an empty batch", %{owner_conn: conn} do
      assert conn |> post_upload([]) |> json_response(422)
    end

    test "returns 507 when the volume is below the floor", %{owner_conn: conn} do
      previous = Application.get_env(:dragncards, :uploads)

      Application.put_env(
        :dragncards,
        :uploads,
        Keyword.put(previous, :free_space_floor_bytes, 999_999_999_999_999)
      )

      on_exit(fn -> Application.put_env(:dragncards, :uploads, previous) end)

      response = conn |> post_upload([{"card.png", "a.png"}]) |> json_response(507)
      assert response["error"]["message"] =~ "low on disk space"
    end

    test "returns 503 when image hosting is not configured on this host", %{owner_conn: conn} do
      previous = Application.get_env(:dragncards, :uploads)
      Application.put_env(:dragncards, :uploads, Keyword.put(previous, :enabled, false))
      on_exit(fn -> Application.put_env(:dragncards, :uploads, previous) end)

      response = conn |> post_upload([{"card.png", "a.png"}]) |> json_response(503)
      assert response["error"]["message"] =~ "not configured"
    end

    test "reports a quota rejection per file", %{owner_conn: conn} do
      previous = Application.get_env(:dragncards, :uploads)
      tiers = [{0, %{max_files: 1, max_bytes: 100_000_000}}]
      Application.put_env(:dragncards, :uploads, Keyword.put(previous, :tiers, tiers))
      on_exit(fn -> Application.put_env(:dragncards, :uploads, previous) end)

      response =
        conn
        |> post_upload([{"tiny_ok.png", "a.png"}, {"tiny_ok.png", "b.png"}])
        |> json_response(200)

      statuses = response["results"] |> Enum.map(& &1["status"]) |> Enum.sort()
      assert statuses == ["error", "ok"]
      assert Enum.find(response["results"], &(&1["status"] == "error"))["error"] =~ "limit reached"
    end
  end

  describe "GET /images" do
    test "lists one directory", %{owner_conn: conn, owner: owner} do
      seed(owner, "root.png")
      seed(owner, "mygame/a.png")

      assert %{"images" => [%{"filename" => "root.webp"}]} =
               conn |> get("/api/v1/images") |> json_response(200)

      assert %{"images" => [%{"filename" => "a.webp"}]} =
               conn |> get("/api/v1/images?dir=mygame") |> json_response(200)
    end

    test "never shows another user's images", %{owner_conn: conn, owner: owner, other: other} do
      seed(owner, "mine.png")
      seed(other, "theirs.png")

      names =
        conn |> get("/api/v1/images") |> json_response(200) |> Map.get("images")
        |> Enum.map(& &1["filename"])

      assert names == ["mine.webp"]
    end
  end

  describe "GET /images/tree" do
    test "returns rolled-up folders and a base url", %{owner_conn: conn, owner: owner} do
      seed(owner, "mygame/English/a.png")
      seed(owner, "mygame/Spanish/b.png")

      response = conn |> get("/api/v1/images/tree") |> json_response(200)
      by_path = Map.new(response["dirs"], &{&1["path"], &1})

      assert by_path["mygame"]["count"] == 2
      assert by_path["mygame/English"]["count"] == 1
      assert String.ends_with?(by_path["mygame/English"]["url"], "/mygame/English/")
      assert response["base_url"] =~ "/u/#{owner.id}/"
    end
  end

  describe "GET /images/quota" do
    test "reports usage, limits and why uploads may be blocked", %{owner_conn: conn, owner: owner} do
      seed(owner, "a.png")
      quota = conn |> get("/api/v1/images/quota") |> json_response(200) |> Map.get("quota")

      assert quota["image_count"] == 1
      assert quota["max_files"] == 100
      assert quota["uploads_enabled"] == true
      assert quota["over_quota"] == false
    end
  end

  describe "delete" do
    test "removes one image and its file", %{owner_conn: conn, owner: owner} do
      image = seed(owner, "a.png")
      path = Paths.abs_path!(owner.id, image.path)

      response = conn |> delete("/api/v1/images/#{image.id}") |> json_response(200)
      assert response["deleted"] == 1
      refute File.exists?(path)
    end

    test "cannot delete another user's image", %{other_conn: conn, owner: owner, other: other} do
      image = seed(owner, "a.png")

      assert conn |> delete("/api/v1/images/#{image.id}") |> json_response(404)
      assert File.exists?(Paths.abs_path!(owner.id, image.path))
      assert Quota.get_or_build(owner.id).image_count == 1
      assert Quota.get_or_build(other.id).image_count == 0
    end

    test "batch delete by ids ignores ids that are not yours", %{
      other_conn: conn,
      owner: owner,
      other: other
    } do
      mine = seed(other, "mine.png")
      theirs = seed(owner, "theirs.png")

      response =
        conn
        |> post("/api/v1/images/delete", %{"ids" => [mine.id, theirs.id]})
        |> json_response(200)

      assert response["deleted"] == 1
      assert File.exists?(Paths.abs_path!(owner.id, theirs.path))
    end

    test "batch delete by dir removes a subtree", %{owner_conn: conn, owner: owner} do
      seed(owner, "mygame/English/a.png")
      seed(owner, "mygame/Spanish/b.png")
      keep = seed(owner, "other/c.png")

      response =
        conn |> post("/api/v1/images/delete", %{"dir" => "mygame"}) |> json_response(200)

      assert response["deleted"] == 2
      assert File.exists?(Paths.abs_path!(owner.id, keep.path))
    end
  end

  describe "move" do
    test "renames an image", %{owner_conn: conn, owner: owner} do
      image = seed(owner, "mygame/a.png")

      response =
        conn
        |> post("/api/v1/images/move", %{"id" => image.id, "path" => "other/b.png"})
        |> json_response(200)

      assert response["image"]["path"] == "other/b.webp"
      assert File.exists?(Paths.abs_path!(owner.id, "other/b.webp"))
      refute File.exists?(Paths.abs_path!(owner.id, "mygame/a.webp"))
    end

    test "cannot move another user's image", %{other_conn: conn, owner: owner} do
      image = seed(owner, "a.png")

      assert conn
             |> post("/api/v1/images/move", %{"id" => image.id, "path" => "stolen.png"})
             |> json_response(404)

      assert File.exists?(Paths.abs_path!(owner.id, image.path))
    end

    test "refuses a path that would escape", %{owner_conn: conn, owner: owner} do
      image = seed(owner, "a.png")

      response =
        conn
        |> post("/api/v1/images/move", %{"id" => image.id, "path" => "../../escaped.png"})
        |> json_response(422)

      assert response["error"] =~ "'..'"
    end
  end

  describe "account deletion" do
    test "removes the user's files from the volume", %{owner: owner} do
      image = seed(owner, "mygame/a.png")
      root = Paths.user_root(owner.id)
      assert File.exists?(Paths.abs_path!(owner.id, image.path))

      {:ok, _} = DragnCards.Users.delete_user(owner.id)

      refute File.exists?(root), "the user's upload tree must not outlive the account"
    end
  end
end
