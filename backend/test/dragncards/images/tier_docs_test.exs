defmodule DragnCards.Images.TierDocsTest do
  @moduledoc """
  The Patreon modal shows image hosting limits from a JSON file in the frontend.
  The real limits live in config.exs. This fails if the two drift apart, so that
  changing a tier cannot silently leave the modal advertising the old numbers.
  """
  use ExUnit.Case, async: true

  @json Path.expand(
          "../../../../frontend/src/features/store/support/imageHostingTiers.json",
          __DIR__
        )

  test "the Patreon modal's tier limits match config.exs" do
    advertised =
      @json
      |> File.read!()
      |> Jason.decode!()
      |> Map.fetch!("tiers")
      |> Enum.map(&{&1["min_level"], %{max_files: &1["max_files"], max_bytes: &1["max_bytes"]}})

    # Tiers are set only in config.exs; no environment file overrides them, so
    # the loaded config is exactly what production uses.
    configured = Application.get_env(:dragncards, :uploads)[:tiers]

    assert advertised == configured,
           """
           imageHostingTiers.json does not match :uploads :tiers in config.exs.
           Update the JSON so the Patreon modal advertises the real limits.
             json:   #{inspect(advertised)}
             config: #{inspect(configured)}
           """
  end
end
