defmodule DragnCards.Images.TranscoderTest do
  use ExUnit.Case, async: true

  alias DragnCards.Images.Transcoder

  @fixtures Path.expand("../../support/fixtures/images", __DIR__)

  setup do
    dir = Path.join(System.tmp_dir!(), "transcode_#{System.unique_integer([:positive])}")
    File.mkdir_p!(dir)
    on_exit(fn -> File.rm_rf(dir) end)
    %{out: dir}
  end

  defp fixture(name), do: Path.join(@fixtures, name)
  defp dest(dir, name), do: Path.join(dir, name)

  defp cards, do: %{max_dim: 900, quality: 80, keep_alpha: false}
  defp backgrounds, do: %{max_dim: 1920, quality: 80, keep_alpha: false}
  defp tokens, do: %{max_dim: 400, quality: 90, keep_alpha: true}

  # Reads the written file back through Probe, which is an independent check:
  # if the transcoder claims 900px, the bytes on disk must agree.
  defp probe_output(path) do
    {:ok, info} = DragnCards.Images.Probe.probe(path)
    info
  end

  describe "output format" do
    test "always WebP, whatever went in", %{out: out} do
      for src <- ~w(card.png photo.jpg anim.gif lossy.webp alpha.png) do
        d = dest(out, src <> ".webp")
        assert {:ok, _} = Transcoder.normalize(fixture(src), d, cards())
        assert %{format: :webp} = probe_output(d), "#{src} did not produce WebP"
      end
    end
  end

  describe "resizing" do
    test "caps the long edge and preserves aspect ratio", %{out: out} do
      d = dest(out, "photo.webp")
      # source is 640x480
      assert {:ok, %{width: w, height: h}} =
               Transcoder.normalize(fixture("photo.jpg"), d, %{cards() | max_dim: 320})

      assert max(w, h) == 320
      assert_in_delta w / h, 640 / 480, 0.02
      assert %{width: ^w, height: ^h} = probe_output(d)
    end

    test "never upscales a source smaller than the cap", %{out: out} do
      d = dest(out, "small.webp")
      # card.png is 123x57, far below the 900 cap
      assert {:ok, %{width: 123, height: 57}} =
               Transcoder.normalize(fixture("card.png"), d, cards())
    end

    test "a background keeps more detail than a card", %{out: out} do
      card_out = dest(out, "as_card.webp")
      bg_out = dest(out, "as_bg.webp")
      src = fixture("photo.jpg")

      assert {:ok, _} = Transcoder.normalize(src, card_out, %{cards() | max_dim: 200})
      assert {:ok, _} = Transcoder.normalize(src, bg_out, backgrounds())

      assert probe_output(bg_out).width > probe_output(card_out).width
    end
  end

  describe "alpha handling" do
    test "the tokens profile preserves transparency", %{out: out} do
      d = dest(out, "token.webp")
      assert {:ok, _} = Transcoder.normalize(fixture("alpha.png"), d, tokens())
      assert Vix.Vips.Image.has_alpha?(elem(Vix.Vips.Image.new_from_file(d), 1))
    end

    test "the cards profile flattens transparency onto white", %{out: out} do
      d = dest(out, "card.webp")
      assert {:ok, _} = Transcoder.normalize(fixture("alpha.png"), d, cards())
      refute Vix.Vips.Image.has_alpha?(elem(Vix.Vips.Image.new_from_file(d), 1))
    end

    test "an opaque source through the tokens profile stays opaque", %{out: out} do
      d = dest(out, "opaque.webp")
      assert {:ok, _} = Transcoder.normalize(fixture("card.png"), d, tokens())
      refute Vix.Vips.Image.has_alpha?(elem(Vix.Vips.Image.new_from_file(d), 1))
    end
  end

  describe "quality" do
    test "a lower quality setting produces a smaller file", %{out: out} do
      lo = dest(out, "lo.webp")
      hi = dest(out, "hi.webp")
      src = fixture("photo.jpg")

      assert {:ok, %{bytes: lo_bytes}} =
               Transcoder.normalize(src, lo, %{cards() | quality: 40})

      assert {:ok, %{bytes: hi_bytes}} =
               Transcoder.normalize(src, hi, %{cards() | quality: 95})

      assert lo_bytes < hi_bytes
    end

    test "reported bytes match the file actually written", %{out: out} do
      d = dest(out, "bytes.webp")
      assert {:ok, %{bytes: bytes}} = Transcoder.normalize(fixture("photo.jpg"), d, cards())
      assert File.stat!(d).size == bytes
    end
  end

  describe "metadata" do
    test "EXIF is stripped from the output", %{out: out} do
      d = dest(out, "stripped.webp")
      assert {:ok, _} = Transcoder.normalize(fixture("exif_rot.jpg"), d, cards())

      {:ok, img} = Vix.Vips.Image.new_from_file(d)
      fields = Vix.Vips.Image.header_field_names(img) |> elem(1)

      refute Enum.any?(fields, &String.starts_with?(&1, "exif-")),
             "EXIF survived into the output: #{inspect(fields)}"

      refute "exif-data" in fields
      refute "orientation" in fields
    end

    test "the ICC profile is converted away, not carried", %{out: out} do
      d = dest(out, "icc.webp")
      assert {:ok, _} = Transcoder.normalize(fixture("icc_p3.png"), d, cards())

      {:ok, img} = Vix.Vips.Image.new_from_file(d)
      fields = Vix.Vips.Image.header_field_names(img) |> elem(1)

      refute "icc-profile-data" in fields,
             "the profile should be converted into sRGB and dropped, not embedded"
    end

    test "a wide-gamut source is converted into sRGB rather than reinterpreted", %{out: out} do
      # wide_red.png and srgb_red.png hold the SAME raw pixel values, but one is
      # tagged AdobeRGB. Those values mean a more saturated red in AdobeRGB than
      # in sRGB, so a correct pipeline must move them; dropping the profile
      # without converting would leave both identical and render the tagged card
      # visibly desaturated.
      read_px = fn path ->
        {:ok, img} = Vix.Vips.Image.new_from_file(path)
        {:ok, val} = Vix.Vips.Operation.getpoint(img, 30, 30)
        val |> Enum.take(3) |> Enum.map(&round/1)
      end

      wide = dest(out, "wide.webp")
      srgb = dest(out, "srgb.webp")
      hi_q = %{cards() | quality: 95}

      assert {:ok, _} = Transcoder.normalize(fixture("wide_red.png"), wide, hi_q)
      assert {:ok, _} = Transcoder.normalize(fixture("srgb_red.png"), srgb, hi_q)

      [wr, _, _] = read_px.(wide)
      [sr, _, _] = read_px.(srgb)

      assert wr > sr + 20,
             "AdobeRGB source was not converted: got #{wr} vs sRGB #{sr}"

      # The untagged source is already sRGB and should pass through untouched.
      assert_in_delta sr, 220, 3
    end

    test "keeping ICC costs only a few KB", %{out: out} do
      # icc_p3.png and icc_none.png are the SAME pixels, differing only in
      # whether a profile is attached, so the delta is the ICC cost alone.
      with_icc = dest(out, "withicc.webp")
      without_icc = dest(out, "withouticc.webp")

      assert {:ok, %{bytes: icc_bytes}} =
               Transcoder.normalize(fixture("icc_p3.png"), with_icc, cards())

      assert {:ok, %{bytes: bare_bytes}} =
               Transcoder.normalize(fixture("icc_none.png"), without_icc, cards())

      overhead = abs(icc_bytes - bare_bytes)

      # The source profile here is a 20KB sRGB v4 profile. Since we convert and
      # drop rather than embed, an ICC-tagged source must not cost meaningfully
      # more to store than the identical untagged one.
      assert overhead < 2_000,
             "profile appears to be embedded: #{overhead} bytes of overhead"
    end
  end

  describe "failure handling" do
    test "a garbage file fails cleanly rather than crashing the caller", %{out: out} do
      d = dest(out, "nope.webp")
      assert {:error, {:transcode_failed, _}} =
               Transcoder.normalize(fixture("notimage.png"), d, cards())
    end

    test "a missing source fails cleanly", %{out: out} do
      d = dest(out, "missing.webp")
      assert {:error, {:transcode_failed, _}} =
               Transcoder.normalize(fixture("nope_at_all.png"), d, cards())
    end

    test "a crash in the transcode does not take down the caller", %{out: out} do
      # async_nolink means the task's exit is reported, not propagated.
      d = dest(out, "x.webp")
      assert {:error, _} = Transcoder.normalize(fixture("empty.png"), d, cards())
      assert Process.alive?(self())
    end
  end

  describe "profiles from config" do
    test "the three configured profiles are present" do
      assert Transcoder.profile_names() == ["backgrounds", "cards", "tokens"]
    end

    test "fetch_profile returns the configured shape" do
      assert {:ok, %{max_dim: 900, quality: 80, keep_alpha: false}} =
               Transcoder.fetch_profile("cards")

      assert {:ok, %{max_dim: 1920}} = Transcoder.fetch_profile("backgrounds")
      assert {:ok, %{max_dim: 400, keep_alpha: true}} = Transcoder.fetch_profile("tokens")
    end

    test "an unknown or non-binary profile is rejected" do
      assert {:error, :unknown_profile} = Transcoder.fetch_profile("enormous")
      assert {:error, :unknown_profile} = Transcoder.fetch_profile(nil)
    end
  end
end
