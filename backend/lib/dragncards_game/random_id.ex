defmodule DragnCardsGame.RandomId do
  @moduledoc """
  Random suffixes for card and stack ids.

  Tests can make ids reproducible by calling `deterministic!/0` in the test
  process; production always uses `:crypto.strong_rand_bytes/1`.
  """

  @key :dragncards_deterministic_id_counter

  def suffix do
    case Process.get(@key) do
      nil ->
        :crypto.strong_rand_bytes(6) |> Base.url_encode64(padding: false)

      n ->
        Process.put(@key, n + 1)
        "id" <> String.pad_leading(Integer.to_string(n), 6, "0")
    end
  end

  def deterministic!(start \\ 0), do: Process.put(@key, start)
end
