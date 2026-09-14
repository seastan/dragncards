defmodule DragnCards.Images.Quota do
  @moduledoc """
  Tier limits and the single place an image is committed to disk and database.

  Limits come from `supporter_level` (dollars/month, already on the users
  table), mirroring the `>= 10 / >= 5 / >= 3` shape used elsewhere, but driven
  from config so every threshold lives in one place.
  """

  import Ecto.Query

  alias DragnCards.Images.{Dirs, Paths, UserImage, UserImageQuota}
  alias DragnCards.{Repo, Users}

  require Logger

  @type limits :: %{max_files: pos_integer, max_bytes: pos_integer}

  @spec limits_for_user(integer()) :: limits
  def limits_for_user(user_id), do: limits_for_level(Users.get_supporter_level(user_id))

  @doc """
  Limits for a supporter level.

  `Users.get_supporter_level/1` already normalises a missing user or a nil level
  to 0, and the config table always ends with a `{0, _}` entry, so this total.
  """
  @spec limits_for_level(integer()) :: limits
  def limits_for_level(level) when is_integer(level) do
    tiers = cfg(:tiers, [])

    case Enum.find(tiers, fn {minimum, _limits} -> level >= minimum end) do
      {_minimum, limits} -> limits
      nil -> %{max_files: 0, max_bytes: 0}
    end
  end

  @doc "Current usage plus the limits it is measured against."
  @spec status(integer()) :: map()
  def status(user_id) do
    quota = get_or_build(user_id)
    limits = limits_for_user(user_id)
    disk = DragnCards.Images.DiskSpace.status()

    over? = over_quota?(quota, limits)

    %{
      image_count: quota.image_count,
      total_bytes: quota.total_bytes,
      max_files: limits.max_files,
      max_bytes: limits.max_bytes,
      over_quota: over?,
      over_quota_since: quota.over_quota_since,
      prune_at: prune_at(quota),
      supporter_level: Users.get_supporter_level(user_id),
      uploads_enabled: disk.ok and not over?,
      storage_ready: disk.storage_ready,
      free_space_low: not disk.ok
    }
  end

  @spec over_quota?(UserImageQuota.t() | map(), limits) :: boolean()
  def over_quota?(quota, limits) do
    quota.image_count > limits.max_files or quota.total_bytes > limits.max_bytes
  end

  @doc """
  Commits one normalised file: reserves quota, writes the row, moves the file
  into place.

  Ordering is deliberate. Transcoding already happened outside this transaction,
  so a database connection is held only for two index lookups and two renames.
  Quota is checked *after* normalisation because the stored size is not knowable
  until the WebP exists. Filesystem work happens last, so a quota rejection
  never touches the disk at all.
  """
  @spec commit(integer(), map()) :: {:ok, UserImage.t()} | {:error, term()}
  def commit(user_id, %{rel: rel, tmp_path: tmp_path} = attrs) do
    limits = limits_for_user(user_id)
    backup = Path.join(Paths.tmp_dir(user_id), "replaced-#{Ecto.UUID.generate()}")

    result =
      Repo.transaction(fn ->
        quota = lock!(user_id)

        # Under the lock, so two concurrent uploads into "english/" and
        # "English/" cannot both decide the folder is new.
        rel = Dirs.canonicalize_rel(user_id, rel)
        dest = Paths.abs_path!(user_id, rel.path)
        existing = find_existing(user_id, rel.path_ci)

        delta_count = if existing, do: 0, else: 1
        delta_bytes = attrs.bytes - if existing, do: existing.bytes, else: 0

        cond do
          quota.image_count + delta_count > limits.max_files ->
            Repo.rollback({:quota_files, quota.image_count, limits.max_files})

          quota.total_bytes + delta_bytes > limits.max_bytes ->
            Repo.rollback({:quota_bytes, quota.total_bytes, limits.max_bytes})

          new_dirs_over_cap?(user_id, rel.dir) ->
            Repo.rollback({:too_many_dirs, Dirs.max_dirs()})

          true ->
            Dirs.ensure!(user_id, rel.dir)
            row = upsert!(user_id, existing, rel, attrs)

            {1, _} =
              Repo.update_all(
                from(q in UserImageQuota, where: q.user_id == ^user_id),
                inc: [image_count: delta_count, total_bytes: delta_bytes]
              )

            # Keep the bytes we are about to overwrite, so a failure here can be
            # undone rather than losing the author's previous image.
            if existing, do: move_aside(dest, backup)

            case place(tmp_path, dest) do
              :ok ->
                {row, existing != nil}

              {:error, reason} ->
                if existing, do: File.rename(backup, dest)
                Repo.rollback({:filesystem, reason})
            end
        end
      end)

    case result do
      {:ok, {row, replaced?}} ->
        if replaced?, do: File.rm(backup)
        {:ok, UserImage.with_url(row)}

      {:error, reason} ->
        File.rm(tmp_path)
        {:error, reason}
    end
  end

  # Only the folders this upload would newly create count against the cap.
  defp new_dirs_over_cap?(_user_id, ""), do: false

  defp new_dirs_over_cap?(user_id, dir) do
    missing = dir |> Paths.dir_ancestors() |> Enum.reject(&Dirs.exists?(user_id, &1)) |> length()
    missing > 0 and Dirs.count(user_id) + missing > Dirs.max_dirs()
  end

  @doc """
  Deletes images by id, decrementing the counters.

  The row goes first and the file is unlinked only after the transaction
  commits: a stray file merely wastes bytes and gets reaped by the reconciler,
  whereas a row with no file is a broken image in somebody's game.
  """
  @spec delete(integer(), [integer()]) :: {:ok, %{deleted: non_neg_integer, bytes: integer}}
  def delete(_user_id, []), do: {:ok, %{deleted: 0, bytes: 0}}

  def delete(user_id, ids) when is_list(ids) do
    {:ok, {rows, count, bytes}} =
      Repo.transaction(fn ->
        _quota = lock!(user_id)

        rows =
          from(i in UserImage, where: i.user_id == ^user_id and i.id in ^ids)
          |> Repo.all()

        count = length(rows)
        bytes = Enum.reduce(rows, 0, &(&1.bytes + &2))

        if count > 0 do
          ids = Enum.map(rows, & &1.id)
          Repo.delete_all(from(i in UserImage, where: i.id in ^ids))

          Repo.update_all(
            from(q in UserImageQuota, where: q.user_id == ^user_id),
            inc: [image_count: -count, total_bytes: -bytes]
          )
        end

        {rows, count, bytes}
      end)

    Enum.each(rows, fn row ->
      row.user_id |> Paths.abs_path!(row.path) |> File.rm()
    end)

    {:ok, %{deleted: count, bytes: bytes}}
  end

  @doc "Reads the counters row, creating it if this user has never uploaded."
  @spec get_or_build(integer()) :: UserImageQuota.t()
  def get_or_build(user_id) do
    case Repo.get_by(UserImageQuota, user_id: user_id) do
      nil -> %UserImageQuota{user_id: user_id, image_count: 0, total_bytes: 0}
      quota -> quota
    end
  end

  @doc """
  Locks this user's counters row for the rest of the transaction.

  Serialises one user's concurrent uploads (multiple in-flight batches, and the
  concurrency within a single batch). Different users never contend.
  """
  @spec lock!(integer()) :: UserImageQuota.t()
  def lock!(user_id) do
    now = DateTime.utc_now() |> DateTime.truncate(:second)

    # Create-if-absent without two concurrent first-uploads racing the row into
    # existence and one of them losing on the primary key.
    Repo.insert_all(
      "user_image_quota",
      [
        [
          user_id: user_id,
          image_count: 0,
          total_bytes: 0,
          notify_count: 0,
          inserted_at: now,
          updated_at: now
        ]
      ],
      on_conflict: :nothing,
      conflict_target: :user_id
    )

    Repo.one!(from(q in UserImageQuota, where: q.user_id == ^user_id, lock: "FOR UPDATE"))
  end

  defp find_existing(user_id, path_ci) do
    Repo.one(from(i in UserImage, where: i.user_id == ^user_id and i.path_ci == ^path_ci))
  end

  defp upsert!(user_id, existing, rel, attrs) do
    base = existing || %UserImage{}

    base
    |> UserImage.changeset(%{
      user_id: user_id,
      dir: rel.dir,
      filename: rel.filename,
      path: rel.path,
      path_ci: rel.path_ci,
      bytes: attrs.bytes,
      width: attrs.width,
      height: attrs.height,
      profile: attrs.profile,
      sha256: attrs.sha256,
      original_filename: attrs[:original_filename],
      original_bytes: attrs[:original_bytes]
    })
    |> Repo.insert_or_update!()
  end

  defp move_aside(dest, backup) do
    File.mkdir_p!(Path.dirname(backup))
    File.rename(dest, backup)
  end

  # tmp and dest live on the same filesystem by construction (both under the
  # upload root), so this is an atomic rename rather than a copy.
  defp place(tmp_path, dest) do
    File.mkdir_p!(Path.dirname(dest))
    File.rename(tmp_path, dest)
  end

  defp prune_at(%{over_quota_since: nil}), do: nil

  defp prune_at(%{over_quota_since: since}),
    do: DateTime.add(since, cfg(:prune_grace_days, 60) * 86_400, :second)

  defp cfg(key, default) do
    :dragncards |> Application.get_env(:uploads, []) |> Keyword.get(key, default)
  end
end
