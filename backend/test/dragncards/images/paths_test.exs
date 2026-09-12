defmodule DragnCards.Images.PathsTest do
  use ExUnit.Case, async: true

  alias DragnCards.Images.Paths

  doctest DragnCards.Images.Paths

  describe "normalize_rel/1 accepts" do
    test "a bare filename" do
      assert {:ok, %{dir: "", filename: "a.webp", path: "a.webp"}} = Paths.normalize_rel("a.png")
    end

    test "subdirectories, which is how languages are organised" do
      assert {:ok, %{dir: "mygame/English", filename: "aragorn.webp",
                     path: "mygame/English/aragorn.webp"}} =
               Paths.normalize_rel("mygame/English/aragorn.png")
    end

    test "any source extension, rewriting it to .webp" do
      for ext <- ~w(.png .jpg .jpeg .gif .webp .PNG .JPG) do
        assert {:ok, %{filename: "card.webp"}} = Paths.normalize_rel("card" <> ext)
      end
    end

    test "unicode filenames" do
      assert {:ok, %{filename: "éowyn.webp"}} = Paths.normalize_rel("éowyn.png")
      assert {:ok, %{filename: "日本語.webp"}} = Paths.normalize_rel("日本語.png")
    end

    test "spaces and inner dots" do
      assert {:ok, %{filename: "Gandalf the Grey.webp"}} =
               Paths.normalize_rel("Gandalf the Grey.png")

      assert {:ok, %{filename: "set.01.card.webp"}} = Paths.normalize_rel("set.01.card.png")
    end

    test "backslashes, which is what a Windows drag-and-drop can produce" do
      assert {:ok, %{path: "mygame/English/a.webp"}} =
               Paths.normalize_rel("mygame\\English\\a.png")
    end

    test "preserving case on disk while folding it for the uniqueness key" do
      assert {:ok, %{path: "MyGame/Aragorn.webp", path_ci: "mygame/aragorn.webp"}} =
               Paths.normalize_rel("MyGame/Aragorn.png")
    end
  end

  describe "normalize_rel/1 rejects" do
    test "traversal in every spelling" do
      for bad <- ["../a.png", "../../etc/passwd.png", "a/../../b.png", "mygame/../../a.png",
                  "..\\..\\a.png", "./a.png"] do
        assert {:error, _} = Paths.normalize_rel(bad), "expected #{bad} to be rejected"
      end
    end

    test "absolute paths" do
      # A leading slash is dropped by split/1, so this must not resolve to /etc.
      assert {:ok, %{path: "etc/passwd.webp"}} = Paths.normalize_rel("/etc/passwd.png")
      refute match?({:ok, %{dir: "/etc"}}, Paths.normalize_rel("/etc/passwd.png"))
    end

    test "an embedded NUL byte" do
      assert {:error, :nul_byte} = Paths.normalize_rel("a\0.png")
    end

    test "dotfiles" do
      assert {:error, :hidden_file} = Paths.normalize_rel(".hidden.png")
      assert {:error, :hidden_file} = Paths.normalize_rel("mygame/.hidden/a.png")
    end

    test "Windows reserved device names" do
      for bad <- ~w(CON.png con.png NUL.png lpt1.png COM9.png) do
        assert {:error, {:reserved_name, _}} = Paths.normalize_rel(bad)
      end
    end

    test "characters that would corrupt a concatenated URL" do
      for bad <- ["a#b.png", "a?b.png", "a%20b.png", "a&b.png", "a+b.png"] do
        assert {:error, {:bad_characters, _}} = Paths.normalize_rel(bad),
               "expected #{bad} to be rejected"
      end
    end

    test "trailing dots and spaces, which Windows silently strips" do
      # A segment ENDING in a space or dot. Interior spaces are fine and common
      # ("Gandalf the Grey.png"), so only the trailing case is rejected.
      assert {:error, :trailing_space} = Paths.normalize_rel("a.png ")
      assert {:error, :trailing_space} = Paths.normalize_rel("mygame /a.png")
      assert {:error, :trailing_dot} = Paths.normalize_rel("mygame./a.png")
    end

    test "an empty path" do
      assert {:error, :empty_path} = Paths.normalize_rel("")
      assert {:error, :empty_path} = Paths.normalize_rel("///")
    end

    test "a path nested deeper than :max_path_depth" do
      assert {:error, {:too_deep, _, _}} =
               Paths.normalize_rel(Enum.map_join(1..9, "/", &"d#{&1}") <> "/a.png")
    end

    test "an over-long segment" do
      assert {:error, :segment_too_long} = Paths.normalize_rel(String.duplicate("a", 101) <> ".png")
    end

    test "an over-long total path" do
      deep = Enum.map_join(1..7, "/", fn _ -> String.duplicate("a", 40) end)
      assert {:error, :path_too_long} = Paths.normalize_rel(deep <> "/b.png")
    end

    test "a non-binary" do
      assert {:error, :invalid_path} = Paths.normalize_rel(nil)
    end
  end

  describe "unicode normalisation" do
    test "NFD and NFC spellings of the same name collide" do
      nfc = "é.png"
      nfd = "é.png"
      refute nfc == nfd

      {:ok, a} = Paths.normalize_rel(nfc)
      {:ok, b} = Paths.normalize_rel(nfd)

      assert a.path_ci == b.path_ci,
             "NFD and NFC must collide, otherwise the DB and the disk drift apart"
    end
  end

  describe "abs_path!/2" do
    setup do
      root = Application.get_env(:dragncards, :uploads)[:root]
      %{root: root}
    end

    test "joins under the user's own directory", %{root: root} do
      assert Paths.abs_path!(42, "mygame/a.webp") ==
               Path.expand(Path.join([root, "u", "42", "mygame", "a.webp"]))
    end

    test "raises rather than escaping, even if validation were bypassed" do
      for bad <- ["../43/a.webp", "../../../etc/passwd", "a/../../../../etc/passwd"] do
        assert_raise ArgumentError, fn -> Paths.abs_path!(42, bad) end
      end
    end

    test "one user's id can never reach another's tree" do
      assert_raise ArgumentError, fn -> Paths.abs_path!(42, "../43/stolen.webp") end
    end
  end

  describe "public urls" do
    test "an absolute url built from the configured base" do
      base = Application.get_env(:dragncards, :uploads)[:public_base_url]
      assert Paths.public_url(42, "mygame/English/a.webp") ==
               "#{base}/u/42/mygame/English/a.webp"
    end

    test "percent-encodes segments but keeps separators" do
      url = Paths.public_url(42, "my game/Gandalf the Grey.webp")
      assert url =~ "my%20game/Gandalf%20the%20Grey.webp"
      refute url =~ "my game"
    end

    test "encodes unicode" do
      assert Paths.public_url(42, "éowyn.webp") =~ "%C3%A9owyn.webp"
    end

    test "directory urls end in a slash, as imageUrlPrefix requires" do
      # applyImageUrlPrefix concatenates with no separator, so the trailing
      # slash is load-bearing.
      assert String.ends_with?(Paths.public_dir_url(42, "mygame/English"), "/English/")
      assert String.ends_with?(Paths.public_dir_url(42, ""), "/u/42/")
    end
  end
end
