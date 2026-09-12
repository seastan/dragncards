defmodule DragnCards.Images.Probe do
  @moduledoc """
  Reads an uploaded file's format and dimensions straight out of its header, in
  pure Elixir, before any decoder touches the bytes.

  This exists for two reasons, both load-bearing:

    1. **Allowlisting the format.** libvips sniffs file *content* and ignores the
       extension, so a well-formed SVG uploaded as `card.png` is loaded by
       `svgload` (verified against libvips 8.18.3). Rendering attacker-supplied
       SVG pulls in librsvg and its XML/external-resource attack surface. Only
       PNG, JPEG, GIF and WebP get past this module.

    2. **Rejecting decompression bombs before allocation**, using the dimensions
       the header *declares* rather than trusting the decoder to cope.

  Everything here is binary pattern matching with no decoding, so there is
  effectively no attack surface in the check itself.
  """

  import Bitwise

  # Large enough to walk past even a pathological run of JPEG APPn segments
  # (EXIF and ICC chunks are up to ~64KB each) before giving up.
  @header_bytes 1_048_576

  @type info :: %{format: :png | :jpeg | :gif | :webp, width: pos_integer, height: pos_integer}

  @doc """
  Inspects `path` and returns `{:ok, info}` or `{:error, reason}`.

  Checks the file's size against `:max_source_bytes` first, so an oversized file
  is rejected without being read.
  """
  @spec probe(Path.t()) :: {:ok, info} | {:error, term()}
  def probe(path) do
    with {:ok, %File.Stat{size: size}} <- File.stat(path),
         :ok <- check_source_bytes(size),
         {:ok, head} <- read_head(path),
         {:ok, format, width, height} <- parse(head) do
      check_dimensions(format, width, height)
    end
  end

  defp check_source_bytes(size) do
    max = cfg(:max_source_bytes, 20_000_000)
    if size > max, do: {:error, {:file_too_large, size, max}}, else: :ok
  end

  defp check_dimensions(format, width, height) do
    max_pixels = cfg(:max_source_pixels, 40_000_000)

    cond do
      width <= 0 or height <= 0 -> {:error, :bad_dimensions}
      width > 20_000 or height > 20_000 -> {:error, {:dimension_too_large, width, height}}
      width * height > max_pixels -> {:error, {:too_many_pixels, width * height, max_pixels}}
      true -> {:ok, %{format: format, width: width, height: height}}
    end
  end

  defp read_head(path) do
    case File.open(path, [:read, :binary, :raw]) do
      {:ok, fd} ->
        head = IO.binread(fd, @header_bytes)
        File.close(fd)

        case head do
          data when is_binary(data) -> {:ok, data}
          _ -> {:error, :empty_file}
        end

      {:error, reason} ->
        {:error, reason}
    end
  end

  # --- PNG: 8-byte signature, then length::32, "IHDR", width::32, height::32
  defp parse(<<0x89, ?P, ?N, ?G, ?\r, ?\n, 0x1A, 0x0A, _len::32, ?I, ?H, ?D, ?R, w::32, h::32,
               _rest::binary>>),
       do: {:ok, :png, w, h}

  # --- GIF87a / GIF89a: logical screen descriptor is little-endian
  defp parse(<<?G, ?I, ?F, ?8, v, ?a, w::little-16, h::little-16, _rest::binary>>)
       when v in [?7, ?9],
       do: {:ok, :gif, w, h}

  # --- WebP lives in a RIFF container with three different chunk layouts
  defp parse(<<?R, ?I, ?F, ?F, _size::little-32, ?W, ?E, ?B, ?P, rest::binary>>), do: webp(rest)

  # --- JPEG: SOI, then walk the marker chain looking for a frame header
  defp parse(<<0xFF, 0xD8, rest::binary>>), do: jpeg(rest)

  defp parse(_), do: {:error, :unsupported_format}

  # Lossy: 14-bit width and height, each stored minus nothing but masked to 14 bits.
  defp webp(<<?V, ?P, ?8, 0x20, _size::little-32, _frame_tag::binary-size(3), 0x9D, 0x01, 0x2A,
              w::little-16, h::little-16, _rest::binary>>),
       do: {:ok, :webp, band(w, 0x3FFF), band(h, 0x3FFF)}

  # Lossless: 14 bits of (width-1) then 14 bits of (height-1), LSB first.
  defp webp(<<?V, ?P, ?8, ?L, _size::little-32, 0x2F, bits::little-32, _rest::binary>>),
    do: {:ok, :webp, band(bits, 0x3FFF) + 1, band(bsr(bits, 14), 0x3FFF) + 1}

  # Extended: canvas size held as two 24-bit little-endian (dimension - 1) values.
  defp webp(<<?V, ?P, ?8, ?X, _size::little-32, _flags::binary-size(4), w::little-24,
              h::little-24, _rest::binary>>),
       do: {:ok, :webp, w + 1, h + 1}

  defp webp(_), do: {:error, :unsupported_format}

  # A run of 0xFF bytes is legal padding between markers.
  defp jpeg(<<0xFF, 0xFF, rest::binary>>), do: jpeg(<<0xFF, rest::binary>>)

  # SOF0..SOF15 carry the frame dimensions, except DHT/JPG/DAC which reuse that
  # marker range for other things.
  defp jpeg(<<0xFF, marker, _len::16, _precision::8, h::16, w::16, _rest::binary>>)
       when marker in 0xC0..0xCF and marker not in [0xC4, 0xC8, 0xCC],
       do: {:ok, :jpeg, w, h}

  # Standalone markers: TEM, RSTn, SOI, EOI. No length field follows.
  defp jpeg(<<0xFF, marker, rest::binary>>)
       when marker in [0x01, 0xD8, 0xD9] or marker in 0xD0..0xD7,
       do: jpeg(rest)

  # Start of scan: compressed data follows, so there is no frame header to find.
  defp jpeg(<<0xFF, 0xDA, _rest::binary>>), do: {:error, :no_frame_header}

  # Any other marker carries a 16-bit length (inclusive of those two bytes).
  defp jpeg(<<0xFF, _marker, len::16, rest::binary>>) when len >= 2 do
    skip = len - 2

    case rest do
      <<_skipped::binary-size(skip), tail::binary>> -> jpeg(tail)
      _ -> {:error, :truncated_header}
    end
  end

  defp jpeg(_), do: {:error, :truncated_header}

  defp cfg(key, default) do
    :dragncards
    |> Application.get_env(:uploads, [])
    |> Keyword.get(key, default)
  end
end
