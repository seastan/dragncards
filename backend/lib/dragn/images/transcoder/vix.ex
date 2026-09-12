defmodule DragnCards.Images.Transcoder.Vix do
  @moduledoc """
  Default transcoder: libvips in-process via the vix NIF.
  """

  @behaviour DragnCards.Images.Transcoder

  alias Vix.Vips.{Image, Operation}

  @impl true
  def normalize(src, dest, %{max_dim: max_dim, quality: quality, keep_alpha: keep_alpha}) do
    File.mkdir_p!(Path.dirname(dest))

    with {:ok, thumb} <- thumbnail(src, max_dim),
         {:ok, srgb} <- to_srgb(thumb),
         {:ok, image} <- maybe_flatten(srgb, keep_alpha),
         :ok <- write(image, dest, quality),
         {:ok, %File.Stat{size: bytes}} <- File.stat(dest) do
      {:ok, %{bytes: bytes, width: Image.width(image), height: Image.height(image)}}
    else
      {:error, reason} -> {:error, {:transcode_failed, reason}}
      other -> {:error, {:transcode_failed, other}}
    end
  end

  # Given a PATH (rather than an already-opened image) libvips uses shrink-on-
  # load: JPEG DCT scaling and partial PNG/WebP decode. That is both the speed
  # win and the real bomb defence -- a 9000x9000 source thumbnails in ~2ms
  # without ever materialising the full raster.
  #
  # size: :VIPS_SIZE_DOWN never upscales, so a small source is left alone rather
  # than being blown up and re-encoded.
  defp thumbnail(src, max_dim) do
    Operation.thumbnail(src, max_dim, height: max_dim, size: :VIPS_SIZE_DOWN)
  end

  # Cards and backgrounds are composited onto white: a transparent card face
  # renders as a hole in the table, and flattening also compresses better.
  # Tokens keep their alpha, which is the whole point of a token.
  defp maybe_flatten(image, true), do: {:ok, image}

  defp maybe_flatten(image, false) do
    if Image.has_alpha?(image) do
      Operation.flatten(image, background: [255.0, 255.0, 255.0])
    else
      {:ok, image}
    end
  end

  # Convert into sRGB using the source's own profile, so the profile itself can
  # then be discarded.
  #
  # Simply dropping the profile would reinterpret a Display P3 or Adobe RGB scan
  # as sRGB and visibly shift its colour. Simply keeping it costs real money at
  # this scale: the sRGB v4 profile alone is ~20KB, which on a 400px token is
  # most of the file, and across a 10,000 image library is ~200MB of the same
  # bytes repeated. Converting gets the colour right at zero storage cost.
  #
  # Images with no embedded profile are already treated as sRGB, so they are
  # left alone rather than pushed through a no-op transform.
  defp to_srgb(image) do
    if has_icc_profile?(image) do
      case Operation.icc_transform(image, "srgb", embedded: true) do
        {:ok, converted} -> {:ok, converted}
        # A broken or unsupported profile should cost the colour conversion, not
        # the whole upload.
        {:error, _} -> {:ok, image}
      end
    else
      {:ok, image}
    end
  end

  defp has_icc_profile?(image) do
    case Image.header_field_names(image) do
      {:ok, fields} -> "icc-profile-data" in fields
      _ -> false
    end
  end

  # Drop all metadata. EXIF is a privacy problem (authors upload phone photos and
  # scanner output with GPS tags) and the ICC profile is redundant now that the
  # pixels are in sRGB.
  #
  # NOTE: this must be `keep:`, not `strip:`. libvips deprecated `strip` in 8.15
  # and silently ignores it, while the default for `keep` retains EXIF -- so
  # `strip: true` looks correct and does nothing at all.
  defp write(image, dest, quality) do
    Operation.webpsave(image, dest, Q: quality, keep: [], effort: 4)
  end
end
