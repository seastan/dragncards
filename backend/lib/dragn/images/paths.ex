defmodule DragnCards.Images.Paths do
  @moduledoc """
  Validates client-supplied relative image paths and maps them to disk and URLs.

  This is the only place a user id plus an untrusted string becomes an absolute
  path. On-disk layout, under the configured `:root`:

      u/<user_id>/<dir>/<name>.webp   the files themselves
      tmp/<user_id>/                  transcode scratch, on the SAME filesystem so
                                      the final rename(2) into place is atomic
      quarantine/<user_id>/           where the reconciler parks orphaned files

  Paths are keyed by numeric `user_id`, never by alias: aliases are user-editable
  and a rename would silently break every `imageUrlPrefix` in every plugin.
  """

  @max_segment_bytes 100
  @max_path_bytes 200

  # Reserved on Windows. A file called CON.webp is awkward to fetch and cannot be
  # unzipped on Windows at all, so refuse it rather than let an author create one.
  @reserved_basenames ~w(con prn aux nul
                         com1 com2 com3 com4 com5 com6 com7 com8 com9
                         lpt1 lpt2 lpt3 lpt4 lpt5 lpt6 lpt7 lpt8 lpt9)

  # A segment starts with a Unicode letter or digit, then allows letters, digits,
  # dot, underscore, hyphen and space. Unicode is allowed deliberately, so
  # non-English filenames work.
  #
  # The exclusions matter: # ? % & + would corrupt the URL that
  # applyImageUrlPrefix (frontend/src/features/engine/functions/common.js:146)
  # builds by plain string concatenation with no encoding. / \ : * " < > | are
  # path or Windows-illegal. Control characters are excluded by construction.
  @segment_regex ~r/^[[:alnum:]][[:alnum:]._ -]*$/u

  @type rel :: %{dir: String.t(), filename: String.t(), path: String.t(), path_ci: String.t()}

  @doc """
  Validates a relative path and returns its normalised parts.

  The extension is rewritten to `.webp`, because that is what gets stored
  regardless of what was uploaded.

      iex> DragnCards.Images.Paths.normalize_rel("mygame/English/Aragorn.png")
      {:ok, %{dir: "mygame/English", filename: "Aragorn.webp",
              path: "mygame/English/Aragorn.webp",
              path_ci: "mygame/english/aragorn.webp"}}
  """
  @spec normalize_rel(String.t()) :: {:ok, rel} | {:error, term()}
  def normalize_rel(raw) when is_binary(raw) do
    with :ok <- reject_nul(raw),
         segments <- split(raw),
         :ok <- check_depth(segments),
         :ok <- check_segments(segments),
         {dirs, [file]} <- Enum.split(segments, length(segments) - 1),
         {:ok, filename} <- to_webp(file),
         dir <- Enum.join(dirs, "/"),
         path <- if(dir == "", do: filename, else: dir <> "/" <> filename),
         :ok <- check_total_length(path) do
      {:ok, %{dir: dir, filename: filename, path: path, path_ci: ci(path)}}
    else
      {:error, _} = error -> error
      _ -> {:error, :invalid_path}
    end
  end

  def normalize_rel(_), do: {:error, :invalid_path}

  @doc """
  Validates a folder path. Same rules as the directory part of
  `normalize_rel/1`, with no filename and no extension rewriting.

      iex> DragnCards.Images.Paths.normalize_dir("mygame/English/")
      {:ok, %{path: "mygame/English", path_ci: "mygame/english"}}
  """
  @spec normalize_dir(String.t()) :: {:ok, %{path: String.t(), path_ci: String.t()}} | {:error, term()}
  def normalize_dir(raw) when is_binary(raw) do
    with :ok <- reject_nul(raw),
         segments <- split(raw),
         :ok <- check_depth(segments),
         :ok <- check_segments(segments),
         path <- Enum.join(segments, "/"),
         :ok <- check_total_length(path) do
      {:ok, %{path: path, path_ci: ci(path)}}
    end
  end

  def normalize_dir(_), do: {:error, :invalid_path}

  @doc "Every ancestor of a folder, root excluded, shallowest first."
  @spec dir_ancestors(String.t()) :: [String.t()]
  def dir_ancestors(""), do: []

  def dir_ancestors(dir) do
    segments = String.split(dir, "/")
    Enum.map(1..length(segments), fn n -> segments |> Enum.take(n) |> Enum.join("/") end)
  end

  @doc """
  Case- and unicode-folded form of a path, used for the uniqueness index.

  ext4 and Postgres are both case-sensitive but macOS and Windows are not, and
  that mismatch is exactly how the database and the disk drift apart. Case is
  preserved on disk and in URLs; only collisions are prevented.
  """
  @spec ci(String.t()) :: String.t()
  def ci(path), do: path |> nfc() |> String.downcase(:default)

  @doc """
  Turns a validated relative path into an absolute one, asserting containment.

  `normalize_rel/1` already makes traversal impossible; this re-expands and
  checks anyway, so that any future caller that skips validation still cannot
  escape the user's directory.
  """
  @spec abs_path!(integer(), String.t()) :: Path.t()
  def abs_path!(user_id, rel) when is_integer(user_id) and is_binary(rel) do
    root = user_root(user_id)
    full = Path.expand(Path.join(root, rel))
    expanded_root = Path.expand(root)

    unless String.starts_with?(full, expanded_root <> "/") do
      raise ArgumentError, "path #{inspect(rel)} escapes #{inspect(expanded_root)}"
    end

    full
  end

  @spec user_root(integer()) :: Path.t()
  def user_root(user_id) when is_integer(user_id),
    do: Path.join([root(), "u", Integer.to_string(user_id)])

  @spec tmp_dir(integer()) :: Path.t()
  def tmp_dir(user_id) when is_integer(user_id),
    do: Path.join([root(), "tmp", Integer.to_string(user_id)])

  @spec quarantine_dir(integer()) :: Path.t()
  def quarantine_dir(user_id) when is_integer(user_id),
    do: Path.join([root(), "quarantine", Integer.to_string(user_id)])

  @doc """
  Absolute public URL for a stored image.

  Each path segment is percent-encoded individually so that a Unicode or spaced
  filename survives, while the separators stay separators.
  """
  @spec public_url(integer(), String.t()) :: String.t()
  def public_url(user_id, rel) do
    encoded =
      rel
      |> String.split("/")
      |> Enum.map_join("/", &URI.encode(&1, fn c -> URI.char_unreserved?(c) end))

    "#{base_url()}/u/#{user_id}/#{encoded}"
  end

  @doc "Absolute public URL for a directory, with a trailing slash, for imageUrlPrefix."
  @spec public_dir_url(integer(), String.t()) :: String.t()
  def public_dir_url(user_id, ""), do: "#{base_url()}/u/#{user_id}/"

  def public_dir_url(user_id, dir), do: public_url(user_id, dir) <> "/"

  def root, do: cfg(:root) || raise("uploads :root is not configured")
  def base_url, do: cfg(:public_base_url) || raise("uploads :public_base_url is not configured")
  def enabled?, do: cfg(:enabled) == true

  # --- internals

  defp split(raw) do
    raw
    |> nfc()
    |> String.replace("\\", "/")
    |> String.split("/", trim: true)
  end

  defp reject_nul(raw), do: if(String.contains?(raw, <<0>>), do: {:error, :nul_byte}, else: :ok)

  defp check_depth([]), do: {:error, :empty_path}

  defp check_depth(segments) do
    max = cfg(:max_path_depth) || 8
    if length(segments) > max, do: {:error, {:too_deep, length(segments), max}}, else: :ok
  end

  defp check_segments(segments) do
    Enum.reduce_while(segments, :ok, fn segment, :ok ->
      case check_segment(segment) do
        :ok -> {:cont, :ok}
        error -> {:halt, error}
      end
    end)
  end

  defp check_segment(segment) do
    basename = segment |> Path.rootname() |> String.downcase()

    cond do
      segment in [".", ".."] -> {:error, :traversal}
      String.starts_with?(segment, ".") -> {:error, :hidden_file}
      byte_size(segment) > @max_segment_bytes -> {:error, :segment_too_long}
      String.ends_with?(segment, ".") -> {:error, :trailing_dot}
      String.ends_with?(segment, " ") -> {:error, :trailing_space}
      basename in @reserved_basenames -> {:error, {:reserved_name, segment}}
      not Regex.match?(@segment_regex, segment) -> {:error, {:bad_characters, segment}}
      true -> :ok
    end
  end

  defp to_webp(file) do
    case Path.rootname(file) do
      "" -> {:error, :invalid_filename}
      stem -> {:ok, stem <> ".webp"}
    end
  end

  defp check_total_length(path),
    do: if(byte_size(path) > @max_path_bytes, do: {:error, :path_too_long}, else: :ok)

  defp nfc(s), do: :unicode.characters_to_nfc_binary(s)

  defp cfg(key) do
    :dragncards |> Application.get_env(:uploads, []) |> Keyword.get(key)
  end
end
