defmodule DragnCards.ImagesTest do
  @moduledoc """
  Context-level tests for plugin image hosting.

  Not async: these write to a real upload tree and rely on the shared sandbox so
  that the concurrency test can use separate processes.
  """
  use DragnCards.DataCase, async: false

  alias DragnCards.Images
  alias DragnCards.Images.{Dirs, Paths, Quota, Reconciler, UserImage, UserImageQuota}
  alias DragnCards.{Repo, Users.User}

  @fixtures Path.expand("../support/fixtures/images", __DIR__)

  setup do
    # Give every test its own upload root so nothing leaks between them.
    root = Path.join(System.tmp_dir!(), "uploads_#{System.unique_integer([:positive])}")
    File.mkdir_p!(Path.join(root, "u"))

    previous = Application.get_env(:dragncards, :uploads)
    Application.put_env(:dragncards, :uploads, Keyword.put(previous, :root, root))

    on_exit(fn ->
      Application.put_env(:dragncards, :uploads, previous)
      File.rm_rf(root)
    end)

    %{root: root, user: make_user("owner@example.com", "owner")}
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

  defp set_level(user, level) do
    user |> Ecto.Changeset.change(supporter_level: level) |> Repo.update!()
  end

  defp fixture(name), do: Path.join(@fixtures, name)

  defp upload(user, rel, opts \\ []) do
    src = Keyword.get(opts, :source, "card.png")
    profile = Keyword.get(opts, :profile, "cards")
    Images.ingest(user.id, rel, profile, fixture(src), original_filename: Path.basename(rel))
  end

  describe "ingest/5" do
    test "stores a normalised webp and returns a usable row", %{user: user} do
      assert {:ok, image} = upload(user, "mygame/English/aragorn.png")

      assert image.path == "mygame/English/aragorn.webp"
      assert image.dir == "mygame/English"
      assert image.filename == "aragorn.webp"
      assert image.profile == "cards"
      assert image.bytes > 0
      assert image.width == 123 and image.height == 57
      assert image.original_filename == "aragorn.png"
      assert File.exists?(Paths.abs_path!(user.id, image.path))
    end

    test "the returned url is absolute and matches the configured base", %{user: user} do
      {:ok, image} = upload(user, "a.png")
      base = Application.get_env(:dragncards, :uploads)[:public_base_url]
      assert image.url == "#{base}/u/#{user.id}/a.webp"
    end

    test "counters move with the stored size", %{user: user} do
      {:ok, image} = upload(user, "a.png")
      quota = Quota.get_or_build(user.id)
      assert quota.image_count == 1
      assert quota.total_bytes == image.bytes
    end

    test "subdirectories are created on disk", %{user: user} do
      {:ok, _} = upload(user, "deep/nested/path/a.png")
      assert File.dir?(Path.join(Paths.user_root(user.id), "deep/nested/path"))
    end

    test "rejects a path that tries to escape", %{user: user} do
      assert {:error, :traversal} = upload(user, "../../etc/passwd.png")
    end

    test "rejects an SVG smuggled in with an image extension", %{user: user} do
      assert {:error, :unsupported_format} = upload(user, "evil.png", source: "svg_as.png")
    end

    test "rejects a decompression bomb", %{user: user} do
      assert {:error, {:too_many_pixels, _, _}} =
               upload(user, "bomb.png", source: "bomb_20000.png")
    end

    test "rejects an unknown profile", %{user: user} do
      assert {:error, :unknown_profile} = upload(user, "a.png", profile: "enormous")
    end

    test "a rejected upload leaves no file and no counter change", %{user: user} do
      assert {:error, _} = upload(user, "evil.png", source: "svg_as.png")
      assert Quota.get_or_build(user.id).image_count == 0
      assert Images.list(user.id) == []
    end
  end

  describe "re-uploading the same path" do
    test "replaces rather than duplicating, and adjusts bytes by the delta", %{user: user} do
      {:ok, first} = upload(user, "a.png", source: "card.png")
      {:ok, second} = upload(user, "a.png", source: "photo.jpg")

      assert first.id == second.id
      quota = Quota.get_or_build(user.id)
      assert quota.image_count == 1, "replacing must not increment the count"
      assert quota.total_bytes == second.bytes
    end

    test "collides case-insensitively, so the disk and DB cannot diverge", %{user: user} do
      {:ok, first} = upload(user, "Aragorn.png")
      {:ok, second} = upload(user, "aragorn.png")

      assert first.id == second.id
      assert Quota.get_or_build(user.id).image_count == 1
    end
  end

  describe "quota limits" do
    test "a free user is cut off at their image count", %{user: user} do
      set_level(user, 0)
      limits = Quota.limits_for_user(user.id)

      # Fill to the limit using a tiny source so this stays fast.
      for n <- 1..limits.max_files do
        assert {:ok, _} = upload(user, "f#{n}.png", source: "tiny_ok.png")
      end

      assert {:error, {:quota_files, _, max}} =
               upload(user, "one_too_many.png", source: "tiny_ok.png")

      assert max == limits.max_files
      assert Quota.get_or_build(user.id).image_count == limits.max_files
      refute File.exists?(Paths.abs_path!(user.id, "one_too_many.webp"))
    end

    test "supporter level raises the limits", %{user: user} do
      assert Quota.limits_for_user(user.id).max_files == 100
      set_level(user, 3)
      assert Quota.limits_for_user(user.id).max_files == 1000
      set_level(user, 5)
      assert Quota.limits_for_user(user.id).max_files == 5000
      set_level(user, 10)
      assert Quota.limits_for_user(user.id).max_files == 10_000
    end

    test "levels between tiers round down", %{user: user} do
      set_level(user, 4)
      assert Quota.limits_for_user(user.id).max_files == 1000
      set_level(user, 7)
      assert Quota.limits_for_user(user.id).max_files == 5000
      set_level(user, 100)
      assert Quota.limits_for_user(user.id).max_files == 10_000
    end

    test "a byte ceiling rejects even when the count is fine", %{user: user} do
      # Squeeze the byte cap so one real image will not fit.
      previous = Application.get_env(:dragncards, :uploads)
      tiers = [{0, %{max_files: 100, max_bytes: 10}}]
      Application.put_env(:dragncards, :uploads, Keyword.put(previous, :tiers, tiers))
      on_exit(fn -> Application.put_env(:dragncards, :uploads, previous) end)

      assert {:error, {:quota_bytes, _, 10}} = upload(user, "a.png")
      assert Quota.get_or_build(user.id).image_count == 0
    end

    test "a quota rejection never writes to disk", %{user: user} do
      previous = Application.get_env(:dragncards, :uploads)
      tiers = [{0, %{max_files: 0, max_bytes: 0}}]
      Application.put_env(:dragncards, :uploads, Keyword.put(previous, :tiers, tiers))
      on_exit(fn -> Application.put_env(:dragncards, :uploads, previous) end)

      assert {:error, {:quota_files, _, 0}} = upload(user, "a.png")
      refute File.exists?(Paths.abs_path!(user.id, "a.webp"))
      # ...and the scratch file is cleaned up rather than accumulating.
      assert File.ls!(Paths.tmp_dir(user.id)) == []
    end
  end

  describe "concurrency" do
    test "racing uploads cannot oversubscribe the last quota slot", %{root: root} do
      # The SQL sandbox funnels every process through the owner's connection, so
      # a test written against it cannot exercise row locking at all: it passes
      # just as happily with the FOR UPDATE removed. Dropping to :auto gives each
      # task a real pooled connection and genuine parallel transactions, at the
      # cost of having to clean up by hand afterwards.
      previous = Application.get_env(:dragncards, :uploads)

      Application.put_env(
        :dragncards,
        :uploads,
        previous
        |> Keyword.put(:tiers, [{0, %{max_files: 5, max_bytes: 100_000_000}}])
        |> Keyword.put(:root, root)
      )

      :ok = Ecto.Adapters.SQL.Sandbox.checkin(Repo)
      :ok = Ecto.Adapters.SQL.Sandbox.mode(Repo, :auto)

      user =
        %User{}
        |> User.changeset(%{
          email: "race#{System.unique_integer([:positive])}@example.com",
          password: "testpassword",
          password_confirmation: "testpassword",
          alias: "race#{System.unique_integer([:positive])}"
        })
        |> Repo.insert!()

      on_exit(fn ->
        Application.put_env(:dragncards, :uploads, previous)
        Repo.delete_all(from(i in UserImage, where: i.user_id == ^user.id))
        Repo.delete_all(from(q in UserImageQuota, where: q.user_id == ^user.id))
        Repo.delete(user)
        Ecto.Adapters.SQL.Sandbox.mode(Repo, :manual)
      end)

      # Pre-transcode nothing: going through the full ingest path is the point,
      # but the transactions are what must overlap, so fire plenty of them.
      results =
        1..30
        |> Enum.map(fn n ->
          Task.async(fn ->
            Images.ingest(user.id, "race#{n}.png", "cards", fixture("tiny_ok.png"))
          end)
        end)
        |> Task.await_many(60_000)

      accepted = Enum.count(results, &match?({:ok, _}, &1))
      rejected = Enum.count(results, &match?({:error, {:quota_files, _, _}}, &1))

      assert accepted == 5,
             "expected exactly 5 winners, got #{accepted}: quota was oversubscribed"

      assert rejected == 25
      assert Quota.get_or_build(user.id).image_count == 5

      on_disk = Path.wildcard(Path.join(Paths.user_root(user.id), "**/*.webp"))
      assert length(on_disk) == 5, "files on disk (#{length(on_disk)}) must match the counter"
    end
  end

  describe "listing and the folder tree" do
    setup %{user: user} do
      {:ok, _} = upload(user, "root.png")
      {:ok, _} = upload(user, "mygame/English/a.png")
      {:ok, _} = upload(user, "mygame/English/b.png")
      {:ok, _} = upload(user, "mygame/Spanish/a.png")
      :ok
    end

    test "list/3 returns one directory only", %{user: user} do
      assert [%{filename: "root.webp"}] = Images.list(user.id, "")

      names = user.id |> Images.list("mygame/English") |> Enum.map(& &1.filename)
      assert names == ["a.webp", "b.webp"]
    end

    test "tree/1 rolls counts up through ancestors", %{user: user} do
      %{dirs: dirs} = Images.tree(user.id)
      by_path = Map.new(dirs, &{&1.path, &1})

      assert by_path[""].count == 4
      assert by_path["mygame"].count == 3
      assert by_path["mygame/English"].count == 2
      assert by_path["mygame/Spanish"].count == 1
    end

    test "tree/1 includes intermediate folders that hold no images directly", %{user: user} do
      %{dirs: dirs} = Images.tree(user.id)
      assert Enum.any?(dirs, &(&1.path == "mygame"))
    end

    test "tree/1 gives each folder a prefix url ending in a slash", %{user: user} do
      %{dirs: dirs} = Images.tree(user.id)
      english = Enum.find(dirs, &(&1.path == "mygame/English"))
      assert String.ends_with?(english.url, "/mygame/English/")
    end

    test "one user never sees another's images", %{user: user} do
      other = make_user("other@example.com", "other")
      {:ok, _} = upload(other, "theirs.png")

      assert Enum.map(Images.list(user.id), & &1.filename) == ["root.webp"]
      assert Enum.map(Images.list(other.id), & &1.filename) == ["theirs.webp"]
    end
  end

  describe "delete" do
    test "removes the row, the file and the counters", %{user: user} do
      {:ok, image} = upload(user, "a.png")
      path = Paths.abs_path!(user.id, image.path)

      assert {:ok, %{deleted: 1, bytes: bytes}} = Images.delete(user.id, [image.id])
      assert bytes == image.bytes
      refute File.exists?(path)
      assert Quota.get_or_build(user.id).image_count == 0
      assert Quota.get_or_build(user.id).total_bytes == 0
    end

    test "ignores ids belonging to somebody else", %{user: user} do
      other = make_user("other@example.com", "other")
      {:ok, theirs} = upload(other, "theirs.png")

      assert {:ok, %{deleted: 0}} = Images.delete(user.id, [theirs.id])
      assert File.exists?(Paths.abs_path!(other.id, theirs.path))
      assert Quota.get_or_build(other.id).image_count == 1
    end

    test "delete_dir removes a whole subtree", %{user: user} do
      {:ok, _} = upload(user, "mygame/English/a.png")
      {:ok, _} = upload(user, "mygame/Spanish/b.png")
      {:ok, keep} = upload(user, "other/c.png")

      assert {:ok, %{deleted: 2}} = Images.delete_dir(user.id, "mygame")
      assert Quota.get_or_build(user.id).image_count == 1
      assert File.exists?(Paths.abs_path!(user.id, keep.path))
    end
  end

  describe "move" do
    test "renames the row and the file without touching the counters", %{user: user} do
      {:ok, image} = upload(user, "mygame/a.png")
      before = Quota.get_or_build(user.id)

      assert {:ok, moved} = Images.move(user.id, image.id, "other/b.png")
      assert moved.path == "other/b.webp"
      refute File.exists?(Paths.abs_path!(user.id, image.path))
      assert File.exists?(Paths.abs_path!(user.id, moved.path))

      after_move = Quota.get_or_build(user.id)
      assert after_move.image_count == before.image_count
      assert after_move.total_bytes == before.total_bytes
    end

    test "refuses another user's image", %{user: user} do
      other = make_user("other@example.com", "other")
      {:ok, theirs} = upload(other, "theirs.png")
      assert {:error, :not_found} = Images.move(user.id, theirs.id, "mine.png")
    end

    test "refuses a path that would escape", %{user: user} do
      {:ok, image} = upload(user, "a.png")
      assert {:error, :traversal} = Images.move(user.id, image.id, "../../escaped.png")
    end
  end


  describe "folders" do
    test "create_dir makes an empty folder that shows in the tree and on disk", %{user: user} do
      assert {:ok, %{path: "mygame/German", url: url}} = Images.create_dir(user.id, "mygame/German")
      assert String.ends_with?(url, "/mygame/German/")
      assert File.dir?(Path.join(Paths.user_root(user.id), "mygame/German"))

      paths = Enum.map(Images.tree(user.id).dirs, & &1.path)
      assert "mygame" in paths and "mygame/German" in paths
      assert Enum.find(Images.tree(user.id).dirs, &(&1.path == "mygame/German")).count == 0
    end

    test "create_dir refuses a name that already exists, ignoring case", %{user: user} do
      {:ok, _} = Images.create_dir(user.id, "English")
      assert {:error, :already_exists} = Images.create_dir(user.id, "english")
    end

    test "create_dir validates the path", %{user: user} do
      assert {:error, :traversal} = Images.create_dir(user.id, "../escape")
      assert {:error, {:bad_characters, _}} = Images.create_dir(user.id, "a#b")
    end

    test "a folder survives having its last image deleted", %{user: user} do
      {:ok, image} = upload(user, "mygame/English/a.png")
      {:ok, _} = Images.delete(user.id, [image.id])
      assert Enum.any?(Images.tree(user.id).dirs, &(&1.path == "mygame/English"))
    end

    test "uploads create their folder and every ancestor", %{user: user} do
      {:ok, _} = upload(user, "a/b/c/card.png")
      assert Dirs.exists?(user.id, "a") and Dirs.exists?(user.id, "a/b") and Dirs.exists?(user.id, "a/b/c")
    end

    test "uploading into a differently-cased folder lands in the existing one", %{user: user} do
      {:ok, _} = Images.create_dir(user.id, "MyGame/English")
      {:ok, image} = upload(user, "mygame/english/aragorn.png")

      # One folder, not two: otherwise the disk (case-sensitive) and the
      # database (case-insensitive) would disagree about what exists.
      assert image.path == "MyGame/English/aragorn.webp"
      assert File.exists?(Path.join(Paths.user_root(user.id), "MyGame/English/aragorn.webp"))
      refute File.exists?(Path.join(Paths.user_root(user.id), "mygame"))
      assert length(Images.tree(user.id).dirs) == 3
    end

    test "moving an image into a differently-cased folder also canonicalises", %{user: user} do
      {:ok, _} = Images.create_dir(user.id, "Tokens")
      {:ok, image} = upload(user, "a.png")
      assert {:ok, %{path: "Tokens/b.webp"}} = Images.move(user.id, image.id, "tokens/b.png")
    end

    test "moving an image onto an existing one is refused, not an overwrite", %{user: user} do
      {:ok, a} = upload(user, "a.png")
      {:ok, b} = upload(user, "b.png", source: "photo.jpg")
      assert {:error, :already_exists} = Images.move(user.id, a.id, "b.png")
      assert Repo.get(UserImage, b.id).bytes == b.bytes
    end

    test "rename_dir moves the folder, its subfolders, its images and the files", %{user: user} do
      {:ok, _} = upload(user, "mygame/English/a.png")
      {:ok, _} = upload(user, "mygame/English/deep/b.png")
      {:ok, _} = Images.create_dir(user.id, "mygame/English/empty")
      root = Paths.user_root(user.id)

      assert {:ok, %{from: "mygame/English", to: "mygame/en", moved: 2}} =
               Images.rename_dir(user.id, "mygame/English", "mygame/en")

      assert File.exists?(Path.join(root, "mygame/en/a.webp"))
      assert File.exists?(Path.join(root, "mygame/en/deep/b.webp"))
      assert File.dir?(Path.join(root, "mygame/en/empty"))
      refute File.exists?(Path.join(root, "mygame/English"))

      paths = Enum.map(Images.tree(user.id).dirs, & &1.path)
      assert "mygame/en/empty" in paths
      refute Enum.any?(paths, &String.starts_with?(&1, "mygame/English"))

      assert [%{path: "mygame/en/a.webp"}] = Images.list(user.id, "mygame/en")
      assert Quota.get_or_build(user.id).image_count == 2
    end

    test "rename_dir can move a folder to a different parent", %{user: user} do
      {:ok, _} = upload(user, "old/English/a.png")
      assert {:ok, %{to: "new/place/English"}} = Images.rename_dir(user.id, "old/English", "new/place/English")
      assert File.exists?(Path.join(Paths.user_root(user.id), "new/place/English/a.webp"))
      assert Dirs.exists?(user.id, "new/place")
    end

    test "rename_dir allows a case-only rename", %{user: user} do
      {:ok, _} = upload(user, "english/a.png")
      assert {:ok, %{to: "English"}} = Images.rename_dir(user.id, "english", "English")
      assert File.exists?(Path.join(Paths.user_root(user.id), "English/a.webp"))
      assert [%{path: "English/a.webp"}] = Images.list(user.id, "English")
    end

    test "rename_dir refuses to overwrite an existing folder", %{user: user} do
      {:ok, _} = upload(user, "a/x.png")
      {:ok, _} = Images.create_dir(user.id, "b")
      assert {:error, :already_exists} = Images.rename_dir(user.id, "a", "B")
      assert File.exists?(Path.join(Paths.user_root(user.id), "a/x.webp"))
    end

    test "rename_dir refuses to move a folder inside itself", %{user: user} do
      {:ok, _} = Images.create_dir(user.id, "a")
      assert {:error, :into_itself} = Images.rename_dir(user.id, "a", "a/b")
    end

    test "rename_dir reports a missing folder", %{user: user} do
      assert {:error, :not_found} = Images.rename_dir(user.id, "nope", "still-nope")
    end

    test "rename_dir only matches whole folder names, not prefixes", %{user: user} do
      {:ok, _} = upload(user, "art/a.png")
      {:ok, _} = upload(user, "artwork/b.png")
      assert {:ok, %{moved: 1}} = Images.rename_dir(user.id, "art", "pictures")
      assert File.exists?(Path.join(Paths.user_root(user.id), "artwork/b.webp"))
    end

    test "underscores in folder names are not treated as wildcards", %{user: user} do
      {:ok, _} = upload(user, "a_b/x.png")
      {:ok, _} = upload(user, "axb/y.png")
      assert {:ok, %{deleted: 1}} = Images.delete_dir(user.id, "a_b")
      assert File.exists?(Path.join(Paths.user_root(user.id), "axb/y.webp"))
    end

    test "delete_dir removes the folder rows, images, counters and directory", %{user: user} do
      {:ok, _} = upload(user, "mygame/English/a.png")
      {:ok, _} = Images.create_dir(user.id, "mygame/English/empty")

      assert {:ok, %{deleted: 1}} = Images.delete_dir(user.id, "mygame")
      refute File.exists?(Path.join(Paths.user_root(user.id), "mygame"))
      assert Enum.map(Images.tree(user.id).dirs, & &1.path) == [""]
      assert Quota.get_or_build(user.id).image_count == 0
    end

    test "delete_dir refuses the root", %{user: user} do
      {:ok, _} = upload(user, "a.png")
      assert {:error, :cannot_delete_root} = Images.delete_dir(user.id, "")
      assert Quota.get_or_build(user.id).image_count == 1
    end

    test "the folder cap applies to new folders only", %{user: user} do
      previous = Application.get_env(:dragncards, :uploads)
      Application.put_env(:dragncards, :uploads, Keyword.put(previous, :max_dirs, 2))
      on_exit(fn -> Application.put_env(:dragncards, :uploads, previous) end)

      {:ok, _} = Images.create_dir(user.id, "a/b")
      assert {:error, {:too_many_dirs, 2}} = Images.create_dir(user.id, "c")
      assert {:error, {:too_many_dirs, 2}} = upload(user, "d/x.png")
      # ...but uploading into folders that already exist is unaffected.
      assert {:ok, _} = upload(user, "a/b/x.png")
    end

    test "one user's folders are invisible to another", %{user: user} do
      other = make_user("other@example.com", "other")
      {:ok, _} = Images.create_dir(other.id, "theirs")
      assert Enum.map(Images.tree(user.id).dirs, & &1.path) == [""]
      assert {:error, :not_found} = Images.rename_dir(user.id, "theirs", "mine")
    end
  end

  describe "reconciler" do
    test "drops rows whose file has vanished", %{user: user} do
      {:ok, image} = upload(user, "a.png")
      File.rm!(Paths.abs_path!(user.id, image.path))

      assert %{rows_without_files: 1, image_count: 0} = Reconciler.reconcile_user(user.id)
      refute Repo.get(UserImage, image.id)
      assert Quota.get_or_build(user.id).image_count == 0
    end

    test "quarantines files with no row instead of deleting them", %{user: user} do
      {:ok, _} = upload(user, "a.png")
      stray = Paths.abs_path!(user.id, "stray.webp")
      File.write!(stray, "stray bytes")

      assert %{files_without_rows: 1} = Reconciler.reconcile_user(user.id)
      refute File.exists?(stray)

      quarantined = Path.join(Paths.quarantine_dir(user.id), "stray.webp")
      assert File.read!(quarantined) == "stray bytes",
             "orphans must be recoverable, not destroyed"
    end

    test "corrects a byte count that has drifted", %{user: user} do
      {:ok, image} = upload(user, "a.png")
      Repo.update_all(from(i in UserImage, where: i.id == ^image.id), set: [bytes: 999_999])

      assert %{size_corrections: 1} = Reconciler.reconcile_user(user.id)
      assert Repo.get(UserImage, image.id).bytes == image.bytes
    end

    test "rebuilds counters that have drifted", %{user: user} do
      {:ok, image} = upload(user, "a.png")

      Repo.update_all(from(q in UserImageQuota, where: q.user_id == ^user.id),
        set: [image_count: 77, total_bytes: 12_345]
      )

      assert %{image_count: 1, total_bytes: bytes} = Reconciler.reconcile_user(user.id)
      assert bytes == image.bytes
      assert Quota.get_or_build(user.id).image_count == 1
    end

    test "is a no-op when nothing is wrong", %{user: user} do
      {:ok, _} = upload(user, "a.png")

      assert %{rows_without_files: 0, files_without_rows: 0, size_corrections: 0} =
               Reconciler.reconcile_user(user.id)
    end

    test "keeps a folder that was emptied, since folders are now real", %{user: user} do
      {:ok, image} = upload(user, "mygame/English/a.png")
      {:ok, %{deleted: 1}} = Images.delete(user.id, [image.id])

      Reconciler.reconcile_user(user.id)

      assert File.dir?(Path.join(Paths.user_root(user.id), "mygame/English"))
      assert Enum.any?(Images.tree(user.id).dirs, &(&1.path == "mygame/English"))
    end

    test "still removes a stray empty directory that no folder row claims", %{user: user} do
      {:ok, _} = upload(user, "a.png")
      stray = Path.join(Paths.user_root(user.id), "stray/deeper")
      File.mkdir_p!(stray)

      Reconciler.reconcile_user(user.id)

      refute File.dir?(Path.join(Paths.user_root(user.id), "stray"))
      assert File.dir?(Paths.user_root(user.id))
    end

    test "creates folder rows for images that predate the folders table", %{user: user} do
      {:ok, _} = upload(user, "old/nested/a.png")
      Repo.delete_all(from(d in DragnCards.Images.UserImageDir, where: d.user_id == ^user.id))

      assert %{dir_rows_created: 2} = Reconciler.reconcile_user(user.id)
      assert Dirs.exists?(user.id, "old") and Dirs.exists?(user.id, "old/nested")
    end

    test "recreates the directory for a folder whose directory went missing", %{user: user} do
      {:ok, _} = Images.create_dir(user.id, "empty")
      File.rmdir!(Path.join(Paths.user_root(user.id), "empty"))

      assert %{dirs_recreated_on_disk: 1} = Reconciler.reconcile_user(user.id)
      assert File.dir?(Path.join(Paths.user_root(user.id), "empty"))
    end
  end

  describe "quota_status/1" do
    test "reports usage against the tier", %{user: user} do
      {:ok, image} = upload(user, "a.png")
      status = Images.quota_status(user.id)

      assert status.image_count == 1
      assert status.total_bytes == image.bytes
      assert status.max_files == 100
      assert status.supporter_level == 0
      refute status.over_quota
      assert status.uploads_enabled
    end

    test "flags a user pushed over quota by a downgrade", %{user: user} do
      set_level(user, 10)
      {:ok, _} = upload(user, "a.png")

      previous = Application.get_env(:dragncards, :uploads)
      tiers = [{0, %{max_files: 0, max_bytes: 0}}]
      Application.put_env(:dragncards, :uploads, Keyword.put(previous, :tiers, tiers))
      on_exit(fn -> Application.put_env(:dragncards, :uploads, previous) end)

      status = Images.quota_status(user.id)
      assert status.over_quota
      refute status.uploads_enabled
    end
  end
end
