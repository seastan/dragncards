defmodule DragnCards.Images.Reconciler do
  @moduledoc """
  Repairs drift between the `user_images` rows and the files on disk.

  Drift is expected in one direction. `Quota.commit/2` writes the row first and
  renames the file last, and `Quota.delete/2` deletes the row first and unlinks
  afterwards, so an interrupted operation leaves a *file with no row* far more
  often than a row with no file. That is the safe direction: a stray file wastes
  bytes, whereas a row with no file is a broken card face in somebody's game.

  Orphaned files are quarantined rather than deleted. An automated repair path
  should never be the thing that destroys an author's artwork.
  """

  import Ecto.Query

  alias DragnCards.Images.{Dirs, Paths, UserImage, UserImageQuota}
  alias DragnCards.Repo

  require Logger

  @quarantine_max_age_days 30

  @doc "Reconciles every user that has rows or counters."
  @spec run_all() :: :ok
  def run_all do
    user_ids =
      from(i in UserImage, distinct: true, select: i.user_id)
      |> Repo.all()
      |> MapSet.new()
      |> MapSet.union(
        from(q in UserImageQuota, select: q.user_id) |> Repo.all() |> MapSet.new()
      )

    Enum.each(user_ids, &reconcile_user/1)
    sweep_quarantine()
    :ok
  end

  @doc """
  Reconciles one user, returning what it had to fix.
  """
  @spec reconcile_user(integer()) :: %{
          rows_without_files: non_neg_integer,
          files_without_rows: non_neg_integer,
          size_corrections: non_neg_integer,
          image_count: non_neg_integer,
          total_bytes: non_neg_integer
        }
  def reconcile_user(user_id) do
    root = Paths.user_root(user_id)
    on_disk = walk(root)

    rows = from(i in UserImage, where: i.user_id == ^user_id) |> Repo.all()
    by_path = Map.new(rows, &{&1.path, &1})

    missing = Enum.reject(rows, &Map.has_key?(on_disk, &1.path))
    orphans = Enum.reject(Map.keys(on_disk), &Map.has_key?(by_path, &1))

    corrections =
      Enum.filter(rows, fn row ->
        case Map.fetch(on_disk, row.path) do
          {:ok, size} -> size != row.bytes
          :error -> false
        end
      end)

    drop_rows(user_id, missing)
    Enum.each(orphans, &quarantine(user_id, &1))
    Enum.each(corrections, fn row -> correct_size(row, Map.fetch!(on_disk, row.path)) end)

    totals = recount(user_id)
    {dirs_created, dirs_recreated} = reconcile_dirs(user_id, root)

    # Only directories nobody asked for: a folder the author created and left
    # empty has a row, and must survive this.
    kept = user_id |> Dirs.list_paths() |> MapSet.new(&Paths.ci/1)
    prune_empty_dirs(root, root, kept)

    Map.merge(totals, %{
      rows_without_files: length(missing),
      files_without_rows: length(orphans),
      size_corrections: length(corrections),
      dir_rows_created: dirs_created,
      dirs_recreated_on_disk: dirs_recreated
    })
  end

  # Every folder implied by an image gets a row (covers images that predate the
  # folders table), and every folder row gets a directory on disk (so an empty
  # folder is still a real directory, and renaming it has something to move).
  defp reconcile_dirs(user_id, root) do
    before = Dirs.count(user_id)

    from(i in UserImage, where: i.user_id == ^user_id, distinct: true, select: i.dir)
    |> Repo.all()
    |> Enum.each(&Dirs.ensure!(user_id, &1))

    created = Dirs.count(user_id) - before

    recreated =
      user_id
      |> Dirs.list_paths()
      |> Enum.count(fn dir ->
        path = Path.join(root, dir)

        if File.dir?(path) do
          false
        else
          File.mkdir_p!(path)
          true
        end
      end)

    {created, recreated}
  end

  @doc "Recomputes the counters row from the images table."
  @spec recount(integer()) :: %{image_count: non_neg_integer, total_bytes: non_neg_integer}
  def recount(user_id) do
    %{count: count, bytes: bytes} =
      from(i in UserImage,
        where: i.user_id == ^user_id,
        select: %{count: count(i.id), bytes: coalesce(sum(i.bytes), 0)}
      )
      |> Repo.one()

    now = DateTime.utc_now() |> DateTime.truncate(:second)

    # Source must be the schema, not the table name: an on_conflict query built
    # from UserImageQuota has to match the {source, schema} pair of the insert.
    Repo.insert_all(
      UserImageQuota,
      [
        [
          user_id: user_id,
          image_count: count,
          total_bytes: bytes,
          notify_count: 0,
          last_reconciled_at: now,
          inserted_at: now,
          updated_at: now
        ]
      ],
      on_conflict:
        from(q in UserImageQuota,
          update: [
            set: [
              image_count: ^count,
              total_bytes: ^bytes,
              last_reconciled_at: ^now,
              updated_at: ^now
            ]
          ]
        ),
      conflict_target: :user_id
    )

    %{image_count: count, total_bytes: bytes}
  end

  defp drop_rows(_user_id, []), do: :ok

  defp drop_rows(user_id, rows) do
    ids = Enum.map(rows, & &1.id)

    Logger.warning(
      "images: user #{user_id} has #{length(ids)} rows with no file on disk; dropping them"
    )

    Repo.delete_all(from(i in UserImage, where: i.id in ^ids))
  end

  defp quarantine(user_id, rel_path) do
    source = Paths.abs_path!(user_id, rel_path)
    target = Path.join(Paths.quarantine_dir(user_id), rel_path)

    File.mkdir_p!(Path.dirname(target))

    case File.rename(source, target) do
      :ok ->
        Logger.warning("images: quarantined orphan #{user_id}/#{rel_path}")

      {:error, reason} ->
        Logger.error("images: could not quarantine #{user_id}/#{rel_path}: #{inspect(reason)}")
    end
  end

  defp correct_size(row, actual) do
    Logger.warning(
      "images: row #{row.id} recorded #{row.bytes} bytes but disk says #{actual}; correcting"
    )

    row
    |> Ecto.Changeset.change(bytes: actual)
    |> Repo.update!()
  end

  @doc "Deletes quarantined files older than #{@quarantine_max_age_days} days."
  @spec sweep_quarantine() :: :ok
  def sweep_quarantine do
    root = Path.join(uploads_root(), "quarantine")
    cutoff = DateTime.add(DateTime.utc_now(), -@quarantine_max_age_days * 86_400, :second)

    root
    |> walk_absolute()
    |> Enum.each(fn path ->
      case File.stat(path, time: :posix) do
        {:ok, %File.Stat{mtime: mtime}} ->
          if DateTime.compare(DateTime.from_unix!(mtime), cutoff) == :lt, do: File.rm(path)

        _ ->
          :ok
      end
    end)

    prune_empty_dirs(root)
    :ok
  end

  # Relative path => size, for every regular file under root.
  defp walk(root) do
    root
    |> walk_absolute()
    |> Map.new(fn path ->
      {Path.relative_to(path, root), File.stat!(path).size}
    end)
  end

  defp walk_absolute(root) do
    case File.ls(root) do
      {:ok, entries} ->
        Enum.flat_map(entries, fn entry ->
          path = Path.join(root, entry)

          cond do
            # Never follow a symlink out of the tree.
            symlink?(path) -> []
            File.dir?(path) -> walk_absolute(path)
            File.regular?(path) -> [path]
            true -> []
          end
        end)

      {:error, _} ->
        []
    end
  end

  defp symlink?(path) do
    match?({:ok, %File.Stat{type: :symlink}}, File.lstat(path))
  end

  # Bottom-up, never removes the root it was given, and spares any directory
  # whose relative path (case-folded) is in `keep`.
  defp prune_empty_dirs(root, dir \\ nil, keep \\ MapSet.new())

  defp prune_empty_dirs(root, nil, keep), do: prune_empty_dirs(root, root, keep)

  defp prune_empty_dirs(base, dir, keep) do
    case File.ls(dir) do
      {:ok, entries} ->
        Enum.each(entries, fn entry ->
          path = Path.join(dir, entry)

          if File.dir?(path) and not symlink?(path) do
            prune_empty_dirs(base, path, keep)
            rel = path |> Path.relative_to(base) |> Paths.ci()
            if File.ls(path) == {:ok, []} and not MapSet.member?(keep, rel), do: File.rmdir(path)
          end
        end)

      {:error, _} ->
        :ok
    end
  end

  defp uploads_root do
    :dragncards |> Application.get_env(:uploads, []) |> Keyword.get(:root)
  end
end
