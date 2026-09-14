defmodule DragnCards.Images do
  @moduledoc """
  User-uploaded plugin images: the public API.

  Nothing outside this module should touch `user_images` rows or the upload
  volume directly. Every function here is scoped by `user_id`, and every
  filesystem path comes from `DragnCards.Images.Paths`, so no caller-supplied id
  or string can reach another user's tree.
  """

  import Ecto.Query

  alias DragnCards.Images.{DiskSpace, Dirs, Paths, Probe, Quota, Transcoder, UserImage}
  alias DragnCards.Repo

  require Logger

  @doc "Whether image hosting is configured and usable on this host."
  @spec enabled?() :: boolean()
  def enabled?, do: Paths.enabled?()

  @doc "Usage, limits and the reasons uploads might be refused."
  @spec quota_status(integer()) :: map()
  def quota_status(user_id), do: Quota.status(user_id)

  @doc """
  Normalises and stores one uploaded file.

  Everything expensive happens before the transaction: the size check, the
  header probe, path validation and the transcode itself. Only then does
  `Quota.commit/2` open a transaction to reserve quota and move the file into
  place.

  `dest_rel` is the caller-supplied relative path, e.g. `"mygame/English/a.png"`.
  """
  @spec ingest(integer(), String.t(), String.t(), Path.t(), keyword()) ::
          {:ok, UserImage.t()} | {:error, term()}
  def ingest(user_id, dest_rel, profile_name, source_path, opts \\ []) do
    with {:ok, profile} <- Transcoder.fetch_profile(profile_name),
         {:ok, rel} <- Paths.normalize_rel(dest_rel),
         {:ok, _probe} <- Probe.probe(source_path),
         {:ok, tmp_path, normalized} <- transcode(user_id, source_path, profile) do
      Quota.commit(user_id, %{
        rel: rel,
        tmp_path: tmp_path,
        bytes: normalized.bytes,
        width: normalized.width,
        height: normalized.height,
        profile: profile_name,
        sha256: sha256(tmp_path),
        original_filename: Keyword.get(opts, :original_filename),
        original_bytes: File.stat!(source_path).size
      })
    end
  end

  @doc "Lists one directory's images, newest first."
  @spec list(integer(), String.t(), keyword()) :: [UserImage.t()]
  def list(user_id, dir \\ "", opts \\ []) do
    limit = Keyword.get(opts, :limit, 200)
    offset = Keyword.get(opts, :offset, 0)

    from(i in UserImage,
      where: i.user_id == ^user_id and i.dir == ^dir,
      order_by: [asc: i.filename],
      limit: ^limit,
      offset: ^offset
    )
    |> Repo.all()
    |> Enum.map(&UserImage.with_url/1)
  end

  @doc """
  The user's folder tree with rolled-up counts and bytes.

  Built from the explicit folder rows, so empty folders appear. It also folds in
  any folder implied by an image path, so a folder can never go missing from the
  tree just because its row has not been created yet (for example, images that
  predate the folders table, before the reconciler has run).
  """
  @spec tree(integer()) :: %{base_url: String.t(), dirs: [map()]}
  def tree(user_id) do
    counts =
      from(i in UserImage,
        where: i.user_id == ^user_id,
        group_by: i.dir,
        select: {i.dir, count(i.id), coalesce(sum(i.bytes), 0)}
      )
      |> Repo.all()

    known =
      (Dirs.list_paths(user_id) ++ Enum.map(counts, &elem(&1, 0)))
      |> Enum.flat_map(&Paths.dir_ancestors/1)
      |> MapSet.new()
      |> MapSet.put("")

    # Roll each folder's own totals up into every ancestor, root included.
    totals =
      Enum.reduce(counts, Map.new(known, &{&1, {0, 0}}), fn {dir, count, bytes}, acc ->
        ["" | Paths.dir_ancestors(dir)]
        |> Enum.reduce(acc, fn ancestor, inner ->
          Map.update(inner, ancestor, {count, bytes}, fn {c, b} -> {c + count, b + bytes} end)
        end)
      end)

    dirs =
      totals
      |> Enum.map(fn {dir, {count, bytes}} ->
        %{
          path: dir,
          name: if(dir == "", do: "/", else: Path.basename(dir)),
          depth: if(dir == "", do: 0, else: length(String.split(dir, "/"))),
          count: count,
          bytes: bytes,
          url: Paths.public_dir_url(user_id, dir)
        }
      end)
      |> Enum.sort_by(&String.downcase(&1.path))

    %{base_url: Paths.public_dir_url(user_id, ""), dirs: dirs}
  end

  @doc """
  Creates an empty folder, along with any missing ancestors.

  Refuses a name that already exists (case-insensitively), so "New folder" can
  tell the author their name clashed instead of silently doing nothing.
  """
  @spec create_dir(integer(), String.t()) :: {:ok, map()} | {:error, term()}
  def create_dir(user_id, raw) do
    with {:ok, %{path: path}} <- Paths.normalize_dir(raw) do
      result =
        Repo.transaction(fn ->
          Quota.lock!(user_id)
          canonical = Dirs.canonicalize(user_id, path)
          missing = canonical |> Paths.dir_ancestors() |> Enum.reject(&Dirs.exists?(user_id, &1))

          cond do
            missing == [] -> Repo.rollback(:already_exists)
            Dirs.count(user_id) + length(missing) > Dirs.max_dirs() -> Repo.rollback({:too_many_dirs, Dirs.max_dirs()})
            true -> Dirs.ensure!(user_id, canonical) && canonical
          end
        end)

      with {:ok, canonical} <- result do
        File.mkdir_p!(Paths.abs_path!(user_id, canonical))
        {:ok, %{path: canonical, url: Paths.public_dir_url(user_id, canonical)}}
      end
    end
  end

  @doc """
  Renames or moves a folder, taking everything inside it along.

  Every image URL under the folder changes, so any plugin whose imageUrlPrefix
  points at the old location stops loading those images until it is updated.
  The UI must warn before calling this.

  Rows and the directory move in one transaction: if the directory rename fails
  the row changes roll back, so the database never describes files that are not
  where it says.
  """
  @spec rename_dir(integer(), String.t(), String.t()) :: {:ok, map()} | {:error, term()}
  def rename_dir(user_id, raw_from, raw_to) do
    with {:ok, from_dir} <- Paths.normalize_dir(raw_from),
         {:ok, to_dir} <- Paths.normalize_dir(raw_to) do
      Repo.transaction(fn ->
        Quota.lock!(user_id)
        do_rename_dir(user_id, from_dir, to_dir)
      end)
      |> case do
        {:ok, %{from: from, to: to, moved: moved}} ->
          {:ok, %{from: from, to: to, moved: moved, url: Paths.public_dir_url(user_id, to)}}

        {:error, _} = error ->
          error
      end
    end
  end

  defp do_rename_dir(user_id, from_dir, to_dir) do
    from = Dirs.canonicalize(user_id, from_dir.path)
    from_ci = Paths.ci(from)
    images = Dirs.images_under(user_id, from)

    # The new parent takes existing casing; the new last segment keeps the
    # author's casing, which is what makes a case-only rename possible.
    to =
      case Path.dirname(to_dir.path) do
        "." -> to_dir.path
        parent -> Dirs.canonicalize(user_id, parent) <> "/" <> Path.basename(to_dir.path)
      end

    to_ci = Paths.ci(to)
    case_only? = to_ci == from_ci
    missing = to |> Paths.dir_ancestors() |> Enum.reject(&Dirs.exists?(user_id, &1))

    cond do
      not Dirs.exists?(user_id, from) and images == [] ->
        Repo.rollback(:not_found)

      to == from ->
        %{from: from, to: to, moved: 0}

      String.starts_with?(to_ci, from_ci <> "/") ->
        Repo.rollback(:into_itself)

      not case_only? and (Dirs.exists?(user_id, to) or Dirs.images_under(user_id, to) != []) ->
        Repo.rollback(:already_exists)

      not case_only? and Dirs.count(user_id) + length(missing) > Dirs.max_dirs() ->
        Repo.rollback({:too_many_dirs, Dirs.max_dirs()})

      true ->
        swap = fn path -> to <> String.slice(path, String.length(from)..-1//1) end

        for d <- Dirs.rows_under(user_id, from) do
          new_path = swap.(d.path)

          from(x in DragnCards.Images.UserImageDir, where: x.id == ^d.id)
          |> Repo.update_all(set: [path: new_path, path_ci: Paths.ci(new_path)])
        end

        for image <- images do
          new_dir = swap.(image.dir)
          new_path = swap.(image.path)

          from(x in UserImage, where: x.id == ^image.id)
          |> Repo.update_all(set: [dir: new_dir, path: new_path, path_ci: Paths.ci(new_path)])
        end

        Dirs.ensure!(user_id, to)

        source = Paths.abs_path!(user_id, from)
        dest = Paths.abs_path!(user_id, to)
        File.mkdir_p!(Path.dirname(dest))

        cond do
          File.dir?(source) ->
            case File.rename(source, dest) do
              :ok -> :ok
              {:error, reason} -> Repo.rollback({:filesystem, reason})
            end

          true ->
            File.mkdir_p!(dest)
        end

        %{from: from, to: to, moved: length(images)}
    end
  end

  @doc "Deletes images by id. Ids not belonging to this user are ignored."
  @spec delete(integer(), [integer()]) :: {:ok, map()}
  def delete(user_id, ids), do: Quota.delete(user_id, ids)

  @doc """
  Deletes a folder, everything in it, and every folder below it.

  The root cannot be deleted this way: it would erase the whole library, which
  no single click in the manager should be able to do.
  """
  @spec delete_dir(integer(), String.t()) :: {:ok, map()} | {:error, term()}
  def delete_dir(_user_id, ""), do: {:error, :cannot_delete_root}

  def delete_dir(user_id, raw) do
    with {:ok, %{path: path}} <- Paths.normalize_dir(raw) do
      {:ok, {dir, count, bytes}} =
        Repo.transaction(fn ->
          Quota.lock!(user_id)
          dir = Dirs.canonicalize(user_id, path)
          images = Dirs.images_under(user_id, dir)
          count = length(images)
          bytes = Enum.reduce(images, 0, &(&1.bytes + &2))

          if count > 0 do
            ids = Enum.map(images, & &1.id)
            Repo.delete_all(from(i in UserImage, where: i.id in ^ids))

            Repo.update_all(
              from(q in DragnCards.Images.UserImageQuota, where: q.user_id == ^user_id),
              inc: [image_count: -count, total_bytes: -bytes]
            )
          end

          ids = user_id |> Dirs.rows_under(dir) |> Enum.map(& &1.id)
          Repo.delete_all(from(d in DragnCards.Images.UserImageDir, where: d.id in ^ids))
          {dir, count, bytes}
        end)

      # After commit, and all at once: the lock above means no upload can have
      # landed in this folder in between.
      File.rm_rf(Paths.abs_path!(user_id, dir))
      {:ok, %{deleted: count, bytes: bytes}}
    end
  end

  @doc """
  Moves or renames a single image.

  Runs under the user's lock so the destination folder's casing is resolved and
  its rows created without racing an upload. A rename onto an existing image is
  refused rather than overwriting it.
  """
  @spec move(integer(), integer(), String.t()) :: {:ok, UserImage.t()} | {:error, term()}
  def move(user_id, id, new_rel) do
    with {:ok, rel} <- Paths.normalize_rel(new_rel) do
      Repo.transaction(fn ->
        Quota.lock!(user_id)

        row = Repo.get_by(UserImage, id: id, user_id: user_id) || Repo.rollback(:not_found)
        rel = Dirs.canonicalize_rel(user_id, rel)
        clash = Repo.get_by(UserImage, user_id: user_id, path_ci: rel.path_ci)
        missing = rel.dir |> Paths.dir_ancestors() |> Enum.reject(&Dirs.exists?(user_id, &1))

        cond do
          rel.path == row.path ->
            row

          clash && clash.id != row.id ->
            Repo.rollback(:already_exists)

          missing != [] and Dirs.count(user_id) + length(missing) > Dirs.max_dirs() ->
            Repo.rollback({:too_many_dirs, Dirs.max_dirs()})

          true ->
            Dirs.ensure!(user_id, rel.dir)

            updated =
              row
              |> UserImage.changeset(%{dir: rel.dir, filename: rel.filename, path: rel.path, path_ci: rel.path_ci})
              |> Repo.update!()

            dest = Paths.abs_path!(user_id, rel.path)
            File.mkdir_p!(Path.dirname(dest))

            case File.rename(Paths.abs_path!(user_id, row.path), dest) do
              :ok -> updated
              {:error, reason} -> Repo.rollback({:filesystem, reason})
            end
        end
      end)
      |> case do
        {:ok, image} -> {:ok, UserImage.with_url(image)}
        {:error, _} = error -> error
      end
    end
  end

  @doc "Checks that this host can accept an upload at all."
  @spec check_uploadable() :: :ok | {:error, term()}
  def check_uploadable do
    if enabled?(), do: DiskSpace.check_floor(), else: {:error, :uploads_disabled}
  end

  # --- internals

  defp transcode(user_id, source_path, profile) do
    tmp_dir = Paths.tmp_dir(user_id)
    File.mkdir_p!(tmp_dir)
    tmp_path = Path.join(tmp_dir, "#{Ecto.UUID.generate()}.webp")

    case Transcoder.normalize(source_path, tmp_path, profile) do
      {:ok, result} -> {:ok, tmp_path, result}
      {:error, reason} -> {:error, reason}
    end
  end

  defp sha256(path) do
    path
    |> File.stream!([], 65_536)
    |> Enum.reduce(:crypto.hash_init(:sha256), &:crypto.hash_update(&2, &1))
    |> :crypto.hash_final()
    |> Base.encode16(case: :lower)
  end
end
