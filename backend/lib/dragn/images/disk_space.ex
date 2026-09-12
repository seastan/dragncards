defmodule DragnCards.Images.DiskSpace do
  @moduledoc """
  Free-space guard for the upload volume.

  Shells out to `df` rather than using `:disksup`, which on OTP 24 only reports
  percent-used and would mean adding `:os_mon` to the release. One fork per
  upload *request* (not per file) is negligible next to transcoding.

  Fails closed: if `df` cannot be read, uploads are refused rather than allowed.
  """

  require Logger

  @doc "Free bytes on the upload volume, or 0 if that cannot be determined."
  @spec free_bytes() :: non_neg_integer()
  def free_bytes do
    case root() do
      nil -> 0
      root -> free_bytes(root)
    end
  end

  @spec free_bytes(Path.t()) :: non_neg_integer()
  def free_bytes(root) do
    # df needs a path that exists. Walking up to the nearest existing ancestor
    # keeps the reading meaningful before the tree has been created, without
    # implying the root itself is usable -- that is storage_ready?/0's job.
    case nearest_existing(root) do
      nil -> 0
      path -> df(path)
    end
  end

  @doc """
  Whether the upload root exists and is writable.

  Deliberately separate from the free-space check and deliberately not
  self-healing: in production the root is a mount point, and silently creating
  it would mean writing to the underlying root filesystem whenever the volume
  failed to mount.
  """
  @spec storage_ready?() :: boolean()
  def storage_ready? do
    case root() do
      nil -> false
      root -> File.dir?(root) and writable?(root)
    end
  end

  defp writable?(path) do
    probe = Path.join(path, ".write_probe_#{System.unique_integer([:positive])}")

    case File.write(probe, "") do
      :ok ->
        File.rm(probe)
        true

      _ ->
        false
    end
  end

  defp nearest_existing(path) do
    expanded = Path.expand(path)

    cond do
      File.exists?(expanded) -> expanded
      Path.dirname(expanded) == expanded -> nil
      true -> nearest_existing(Path.dirname(expanded))
    end
  end

  defp df(root) do
    case System.cmd("df", ["-Pk", root], stderr_to_stdout: true) do
      {output, 0} -> parse_df(output)
      {output, status} ->
        Logger.warning("df #{root} failed (#{status}): #{String.trim(output)}")
        0
    end
  rescue
    error ->
      Logger.warning("df #{inspect(root)} raised: #{inspect(error)}")
      0
  end

  @doc """
  `:ok` when there is room to accept uploads, `{:error, :disk_full}` otherwise.

  This is a global stop, not a per-user one: it protects the volume itself, so
  it blocks everyone regardless of individual quota.
  """
  @spec check_floor() :: :ok | {:error, :disk_full | :storage_unavailable}
  def check_floor do
    cond do
      not storage_ready?() -> {:error, :storage_unavailable}
      free_bytes() < floor_bytes() -> {:error, :disk_full}
      true -> :ok
    end
  end

  @spec floor_bytes() :: non_neg_integer()
  def floor_bytes, do: cfg(:free_space_floor_bytes, 1_073_741_824)

  @doc "Snapshot for the quota endpoint, so the UI can explain itself."
  @spec status() :: %{
          free_bytes: non_neg_integer,
          floor_bytes: non_neg_integer,
          storage_ready: boolean,
          ok: boolean
        }
  def status do
    free = free_bytes()
    floor = floor_bytes()
    ready = storage_ready?()

    %{free_bytes: free, floor_bytes: floor, storage_ready: ready, ok: ready and free >= floor}
  end

  # df -Pk guarantees a single-line POSIX record per filesystem:
  #   Filesystem 1024-blocks Used Available Capacity Mounted-on
  defp parse_df(output) do
    output
    |> String.split("\n", trim: true)
    |> Enum.drop(1)
    |> List.first()
    |> case do
      nil ->
        0

      line ->
        case String.split(line, ~r/\s+/, trim: true) do
          [_fs, _blocks, _used, available | _] ->
            case Integer.parse(available) do
              {kb, _} -> kb * 1024
              :error -> 0
            end

          _ ->
            0
        end
    end
  end

  defp root, do: cfg(:root, nil)

  defp cfg(key, default) do
    :dragncards |> Application.get_env(:uploads, []) |> Keyword.get(key, default)
  end
end
