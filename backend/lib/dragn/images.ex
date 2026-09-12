defmodule DragnCards.Images do
  @moduledoc """
  User-uploaded plugin images: the public API.

  Nothing outside this module should touch `user_images` rows or the upload
  volume directly. Every function here is scoped by `user_id`, and every
  filesystem path comes from `DragnCards.Images.Paths`, so no caller-supplied id
  or string can reach another user's tree.
  """

  import Ecto.Query

  alias DragnCards.Images.{DiskSpace, Paths, Probe, Quota, Transcoder, UserImage}
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

  Folders are derived from image rows rather than stored, so an empty folder
  cannot exist. That removes a whole class of database/disk drift, at the cost
  of "create folder" not being a thing: you make a folder by uploading into it.
  """
  @spec tree(integer()) :: %{base_url: String.t(), dirs: [map()]}
  def tree(user_id) do
    rows =
      from(i in UserImage,
        where: i.user_id == ^user_id,
        group_by: i.dir,
        select: %{dir: i.dir, count: count(i.id), bytes: coalesce(sum(i.bytes), 0)}
      )
      |> Repo.all()

    # Roll each directory's totals up into all of its ancestors, and make sure
    # intermediate directories appear even when they hold no images themselves.
    totals =
      Enum.reduce(rows, %{}, fn %{dir: dir, count: count, bytes: bytes}, acc ->
        dir
        |> ancestors()
        |> Enum.reduce(acc, fn ancestor, inner ->
          Map.update(inner, ancestor, {count, bytes}, fn {c, b} ->
            {c + count, b + bytes}
          end)
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
      |> Enum.sort_by(& &1.path)

    %{base_url: Paths.public_dir_url(user_id, ""), dirs: dirs}
  end

  @doc "Deletes images by id. Ids not belonging to this user are ignored."
  @spec delete(integer(), [integer()]) :: {:ok, map()}
  def delete(user_id, ids), do: Quota.delete(user_id, ids)

  @doc "Deletes every image under a directory, inclusive of subdirectories."
  @spec delete_dir(integer(), String.t()) :: {:ok, map()}
  def delete_dir(user_id, dir) do
    ids = dir |> images_under(user_id) |> Enum.map(& &1.id)
    Quota.delete(user_id, ids)
  end

  @doc """
  Moves or renames a single image.

  Byte totals do not change, so this only needs to rewrite the row and rename
  the file; the counters are untouched.
  """
  @spec move(integer(), integer(), String.t()) :: {:ok, UserImage.t()} | {:error, term()}
  def move(user_id, id, new_rel) do
    with {:ok, rel} <- Paths.normalize_rel(new_rel),
         %UserImage{} = row <- Repo.get_by(UserImage, id: id, user_id: user_id) do
      source = Paths.abs_path!(user_id, row.path)
      dest = Paths.abs_path!(user_id, rel.path)

      if rel.path_ci == row.path_ci do
        {:ok, UserImage.with_url(row)}
      else
        do_move(row, source, dest, rel)
      end
    else
      nil -> {:error, :not_found}
      {:error, _} = error -> error
    end
  end

  defp do_move(row, source, dest, rel) do
    changeset =
      UserImage.changeset(row, %{dir: rel.dir, filename: rel.filename, path: rel.path, path_ci: rel.path_ci})

    case Repo.update(changeset) do
      {:ok, updated} ->
        File.mkdir_p!(Path.dirname(dest))

        case File.rename(source, dest) do
          :ok ->
            {:ok, UserImage.with_url(updated)}

          {:error, reason} ->
            # Put the row back so it keeps describing the file that still exists.
            Repo.update!(UserImage.changeset(updated, Map.from_struct(row)))
            {:error, {:filesystem, reason}}
        end

      {:error, changeset} ->
        {:error, changeset}
    end
  end

  @doc "Every image at or below a directory."
  @spec images_under(String.t(), integer()) :: [UserImage.t()]
  def images_under("", user_id) do
    from(i in UserImage, where: i.user_id == ^user_id) |> Repo.all()
  end

  def images_under(dir, user_id) do
    prefix = dir <> "/%"

    from(i in UserImage,
      where: i.user_id == ^user_id and (i.dir == ^dir or like(i.dir, ^prefix))
    )
    |> Repo.all()
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

  defp ancestors(""), do: [""]

  defp ancestors(dir) do
    segments = String.split(dir, "/")

    [""] ++
      Enum.map(1..length(segments), fn n ->
        segments |> Enum.take(n) |> Enum.join("/")
      end)
  end
end
