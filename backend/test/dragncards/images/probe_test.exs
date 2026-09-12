defmodule DragnCards.Images.ProbeTest do
  use ExUnit.Case, async: true

  alias DragnCards.Images.Probe

  @fixtures Path.expand("../../support/fixtures/images", __DIR__)

  defp fixture(name), do: Path.join(@fixtures, name)
  defp probe(name), do: Probe.probe(fixture(name))

  describe "supported formats" do
    test "PNG" do
      assert {:ok, %{format: :png, width: 123, height: 57}} = probe("card.png")
    end

    test "PNG with alpha" do
      assert {:ok, %{format: :png, width: 64, height: 64}} = probe("alpha.png")
    end

    test "JPEG" do
      assert {:ok, %{format: :jpeg, width: 640, height: 480}} = probe("photo.jpg")
    end

    test "JPEG with EXIF orientation walks past the APPn segments to the frame header" do
      assert {:ok, %{format: :jpeg, width: 300, height: 200}} = probe("exif_rot.jpg")
    end

    test "GIF" do
      assert {:ok, %{format: :gif, width: 61, height: 93}} = probe("anim.gif")
    end

    test "WebP (lossy VP8)" do
      assert {:ok, %{format: :webp, width: 200, height: 150}} = probe("lossy.webp")
    end

    test "WebP (lossless VP8L)" do
      assert {:ok, %{format: :webp, width: 77, height: 31}} = probe("lossless.webp")
    end

    test "WebP (extended VP8X, which is what alpha produces)" do
      assert {:ok, %{format: :webp, width: 90, height: 40}} = probe("alpha.webp")
    end
  end

  describe "rejects what libvips would otherwise happily decode" do
    test "an SVG uploaded as .png" do
      # libvips sniffs content, not the extension, and loads this via svgload.
      # This is the single most important case in the module.
      assert {:error, :unsupported_format} = probe("svg_as.png")
    end

    test "a PDF uploaded as .png" do
      assert {:error, :unsupported_format} = probe("pdf_as.png")
    end

    test "a text file with an image extension" do
      assert {:error, :unsupported_format} = probe("notimage.png")
    end

    test "an empty file" do
      assert {:error, _} = probe("empty.png")
    end

    test "a missing file" do
      assert {:error, :enoent} = probe("does_not_exist.png")
    end
  end

  describe "decompression bombs are rejected on declared dimensions" do
    test "a header claiming 20000x20000 exceeds the pixel budget" do
      assert {:error, {:too_many_pixels, 400_000_000, _}} = probe("bomb_20000.png")
    end

    test "a header claiming 12000x12000 also exceeds it" do
      assert {:error, {:too_many_pixels, 144_000_000, _}} = probe("bomb_12000.png")
    end

    test "rejection happens without reading any pixel data" do
      # The bomb fixtures are a few dozen bytes: there is no pixel data at all,
      # so a pass means the verdict came from the header alone.
      assert File.stat!(fixture("bomb_20000.png")).size < 100
    end
  end

  describe "truncated input" do
    test "a truncated JPEG still yields its frame header if SOF survived" do
      assert {:ok, %{format: :jpeg, width: 640, height: 480}} = probe("truncated.jpg")
    end

    test "a PNG cut off before IHDR is rejected" do
      path = Path.join(System.tmp_dir!(), "cut_#{System.unique_integer([:positive])}.png")
      File.write!(path, <<0x89, ?P, ?N, ?G, ?\r, ?\n, 0x1A, 0x0A, 0, 0>>)
      on_exit(fn -> File.rm(path) end)
      assert {:error, :unsupported_format} = Probe.probe(path)
    end
  end

  describe "size limits" do
    test "a file over :max_source_bytes is rejected before it is read" do
      path = Path.join(System.tmp_dir!(), "big_#{System.unique_integer([:positive])}.png")
      limit = Application.get_env(:dragncards, :uploads)[:max_source_bytes]
      File.write!(path, :binary.copy(<<0>>, limit + 1))
      on_exit(fn -> File.rm(path) end)
      assert {:error, {:file_too_large, _, ^limit}} = Probe.probe(path)
    end

    test "a small valid image passes" do
      assert {:ok, %{format: :png, width: 8, height: 8}} = probe("tiny_ok.png")
    end
  end
end
