defmodule DragnCards.Images.Dirs do
  @moduledoc """
  Explicit folders for a user's image library.

  Folder names are unique case-insensitively (`path_ci`) while the disk is
  case-sensitive, so every write goes through `canonicalize/2`: uploading into
  `english/` when `English/` already exists lands in `English/`. Without that,
  one logical folder would silently split into two directories on disk.

  Functions that write must run inside a transaction holding the user's quota
  row lock (`Quota.lock!/1`), which serialises all of one user's uploads, moves
  and folder operations, so canonicalisation cannot race.
  """

  import Ecto.Query

  alias DragnCards.Images.{Paths, UserImage, UserImageDir}
  alias DragnCards.Repo

  @doc """
  Rewrites the folder part of a path to match the stored casing of any existing
  folders, segment by segment. Folders that do not exist yet keep the caller's
  casing.
  """
  @spec canonicalize(integer(), String.t()) :: String.t()
  def canonicalize(_user_id, ""), do: ""

  def canonicalize(user_id, dir) do
    ancestors = Paths.dir_ancestors(dir)
    keys = Enum.map(ancestors, &Paths.ci/1)

    stored =
      from(d in UserImageDir, where: d.user_id == ^user_id and d.path_ci in ^keys, select: {d.path_ci, d.path})
      |> Repo.all()
      |> Map.new()

    # Walk down one segment at a time, taking the stored casing where it exists
    # and appending the caller's segment where it does not.
    dir
    |> String.split("/")
    |> Enum.reduce({"", []}, fn segment, {_prev, acc} ->
      candidate = Enum.join(acc ++ [segment], "/")

      resolved =
        case Map.fetch(stored, Paths.ci(candidate)) do
          {:ok, existing} -> existing
          :error -> candidate
        end

      {resolved, String.split(resolved, "/")}
    end)
    |> elem(0)
  end

  @doc "Canonicalises the folder of a validated file path (see Paths.normalize_rel/1)."
  @spec canonicalize_rel(integer(), map()) :: map()
  def canonicalize_rel(user_id, %{dir: dir, filename: filename} = rel) do
    case canonicalize(user_id, dir) do
      ^dir ->
        rel

      canonical ->
        path = if canonical == "", do: filename, else: canonical <> "/" <> filename
        %{rel | dir: canonical, path: path, path_ci: Paths.ci(path)}
    end
  end

  @doc "Creates rows for a folder and all its ancestors that do not exist yet."
  @spec ensure!(integer(), String.t()) :: :ok
  def ensure!(_user_id, ""), do: :ok

  def ensure!(user_id, dir) do
    now = DateTime.utc_now() |> DateTime.truncate(:second)

    rows =
      for ancestor <- Paths.dir_ancestors(dir) do
        [user_id: user_id, path: ancestor, path_ci: Paths.ci(ancestor), inserted_at: now, updated_at: now]
      end

    Repo.insert_all(UserImageDir, rows, on_conflict: :nothing, conflict_target: [:user_id, :path_ci])
    :ok
  end

  @spec exists?(integer(), String.t()) :: boolean()
  def exists?(_user_id, ""), do: true

  def exists?(user_id, dir) do
    key = Paths.ci(dir)
    Repo.exists?(from(d in UserImageDir, where: d.user_id == ^user_id and d.path_ci == ^key))
  end

  @spec count(integer()) :: non_neg_integer()
  def count(user_id),
    do: Repo.aggregate(from(d in UserImageDir, where: d.user_id == ^user_id), :count, :id)

  @doc "All stored folder paths for a user."
  @spec list_paths(integer()) :: [String.t()]
  def list_paths(user_id),
    do: from(d in UserImageDir, where: d.user_id == ^user_id, select: d.path) |> Repo.all()

  @doc "Stored folders at or below `dir`, by case-insensitive prefix."
  @spec rows_under(integer(), String.t()) :: [UserImageDir.t()]
  def rows_under(user_id, dir) do
    key = Paths.ci(dir)
    prefix = like_escape(key) <> "/%"

    from(d in UserImageDir,
      where: d.user_id == ^user_id and (d.path_ci == ^key or like(d.path_ci, ^prefix))
    )
    |> Repo.all()
  end

  @doc "Images whose folder is at or below `dir`, by case-insensitive prefix."
  @spec images_under(integer(), String.t()) :: [UserImage.t()]
  def images_under(user_id, ""),
    do: from(i in UserImage, where: i.user_id == ^user_id) |> Repo.all()

  def images_under(user_id, dir) do
    key = Paths.ci(dir)
    prefix = like_escape(key) <> "/%"

    from(i in UserImage,
      where: i.user_id == ^user_id and (like(i.path_ci, ^prefix))
    )
    |> Repo.all()
  end

  @doc "Maximum number of folders one user may have."
  @spec max_dirs() :: pos_integer()
  def max_dirs, do: :dragncards |> Application.get_env(:uploads, []) |> Keyword.get(:max_dirs, 1_000)

  # % and _ are LIKE wildcards; validated paths cannot contain % but can contain _.
  defp like_escape(s), do: s |> String.replace("\\", "\\\\") |> String.replace("%", "\\%") |> String.replace("_", "\\_")
end
