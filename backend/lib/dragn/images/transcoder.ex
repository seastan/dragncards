defmodule DragnCards.Images.Transcoder do
  @moduledoc """
  Normalises an uploaded image to WebP according to an upload profile.

  Dispatches to a configured implementation so the backend can be swapped
  without touching callers. The default `Vix` runs libvips in-process as a NIF,
  which is fast and memory-cheap but shares its fate with the BEAM: a segfault
  would take down every live GameUIServer and websocket. `VipsCli` does the same
  work in a subprocess and is the escape hatch if that ever happens.

  Two things keep the in-process risk low:

    * `DragnCards.Images.Probe` allowlists the format before any decoder sees the
      bytes, so libvips is never handed an SVG, PDF or pixel bomb.
    * Every call runs in a supervised task with a hard timeout, so a hang costs
      one file rather than parking the request forever.
  """

  @type profile :: %{max_dim: pos_integer, quality: pos_integer, keep_alpha: boolean}
  @type result :: %{bytes: non_neg_integer, width: pos_integer, height: pos_integer}

  @callback normalize(src :: Path.t(), dest :: Path.t(), profile) ::
              {:ok, result} | {:error, term()}

  @doc """
  Normalises `src` into `dest`, returning the written file's size and dimensions.

  `dest` should live on the same filesystem as its final home so that the
  caller's rename into place is atomic rather than a cross-device copy.
  """
  @spec normalize(Path.t(), Path.t(), profile) :: {:ok, result} | {:error, term()}
  def normalize(src, dest, profile) do
    impl = impl()

    task =
      Task.Supervisor.async_nolink(DragnCards.Images.TaskSupervisor, fn ->
        impl.normalize(src, dest, profile)
      end)

    case Task.yield(task, timeout()) || Task.shutdown(task, :brutal_kill) do
      {:ok, result} ->
        result

      {:exit, reason} ->
        File.rm(dest)
        {:error, {:transcode_crashed, reason}}

      nil ->
        File.rm(dest)
        {:error, :transcode_timeout}
    end
  end

  @doc "Looks up a named profile from config."
  @spec fetch_profile(String.t()) :: {:ok, profile} | {:error, :unknown_profile}
  def fetch_profile(name) when is_binary(name) do
    case profiles() do
      %{^name => profile} -> {:ok, profile}
      _ -> {:error, :unknown_profile}
    end
  end

  def fetch_profile(_), do: {:error, :unknown_profile}

  @spec profile_names() :: [String.t()]
  def profile_names, do: profiles() |> Map.keys() |> Enum.sort()

  defp profiles, do: cfg(:profiles, %{})
  defp impl, do: cfg(:transcoder, DragnCards.Images.Transcoder.Vix)
  defp timeout, do: cfg(:transcode_timeout_ms, 20_000)

  defp cfg(key, default) do
    :dragncards |> Application.get_env(:uploads, []) |> Keyword.get(key, default)
  end
end
