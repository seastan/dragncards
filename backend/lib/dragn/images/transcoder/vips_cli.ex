defmodule DragnCards.Images.Transcoder.VipsCli do
  @moduledoc """
  Subprocess transcoder, using the `vips` binary from libvips-tools.

  Same libvips, same output, but isolated in its own OS process so a crash is an
  exit status rather than a dead BEAM. Slower, because it forks per image.

  This is the escape hatch: switch to it with

      config :dragncards, :uploads, transcoder: DragnCards.Images.Transcoder.VipsCli

  after `apt install libvips-tools`. Nothing else needs to change.
  """

  @behaviour DragnCards.Images.Transcoder

  @impl true
  def normalize(src, dest, %{max_dim: max_dim, quality: quality, keep_alpha: keep_alpha}) do
    File.mkdir_p!(Path.dirname(dest))

    # thumbnail writes straight to the target; the [Q=..,strip] suffix is how the
    # CLI passes save options.
    args = [
      "thumbnail",
      src,
      dest <> "[Q=#{quality},strip]",
      Integer.to_string(max_dim),
      "--height",
      Integer.to_string(max_dim),
      "--size",
      "down"
    ]

    args = if keep_alpha, do: args, else: args ++ ["--no-rotate"]

    case System.cmd(vips_bin(), args, stderr_to_stdout: true) do
      {_output, 0} ->
        case File.stat(dest) do
          {:ok, %File.Stat{size: bytes}} -> {:ok, Map.put(dimensions(dest), :bytes, bytes)}
          {:error, reason} -> {:error, {:transcode_failed, reason}}
        end

      {output, status} ->
        File.rm(dest)
        {:error, {:transcode_failed, {:exit_status, status, String.trim(output)}}}
    end
  end

  defp dimensions(path) do
    with {w, 0} <- System.cmd(vipsheader_bin(), ["-f", "width", path]),
         {h, 0} <- System.cmd(vipsheader_bin(), ["-f", "height", path]) do
      %{width: String.to_integer(String.trim(w)), height: String.to_integer(String.trim(h))}
    else
      _ -> %{width: 0, height: 0}
    end
  end

  defp vips_bin, do: System.get_env("VIPS_BIN") || "vips"
  defp vipsheader_bin, do: System.get_env("VIPSHEADER_BIN") || "vipsheader"
end
