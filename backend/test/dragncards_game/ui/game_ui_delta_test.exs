defmodule DragnCardsGame.GameUIDeltaTest do
  @moduledoc """
  GameUI.fast_delta/2 must produce exactly the delta the MapDiff-based
  implementation produces, and apply_delta/3 must round-trip it.
  """
  use ExUnit.Case, async: true
  alias DragnCardsGame.GameUI

  defp assert_same_delta(old, new) do
    assert GameUI.fast_delta(old, new) == GameUI.legacy_delta(old, new),
           "delta mismatch for\n#{inspect(old)}\n->\n#{inspect(new)}"
  end

  test "identical maps give nil" do
    m = %{"a" => 1, "b" => %{"c" => [1, 2]}}
    assert GameUI.fast_delta(m, m) == nil
    assert GameUI.fast_delta(m, Map.new(m)) == nil
    assert_same_delta(m, m)
  end

  test "primitive changes, additions and removals" do
    old = %{"a" => 1, "b" => "x", "c" => [1], "d" => %{"e" => 1}, "gone" => true}
    new = %{"a" => 2, "b" => "x", "c" => [1, 2], "d" => %{"e" => 1, "f" => nil}, "new" => %{"k" => 1}}

    assert GameUI.fast_delta(old, new) == %{
             "a" => [1, 2],
             "c" => [[1], [1, 2]],
             "d" => %{"f" => [":removed", nil]},
             "gone" => [true, ":removed"],
             "new" => [":removed", %{"k" => 1}]
           }

    assert_same_delta(old, new)
  end

  test "integers and floats are different values" do
    assert_same_delta(%{"a" => 1}, %{"a" => 1.0})
    assert GameUI.fast_delta(%{"a" => 1}, %{"a" => 1.0}) == %{"a" => [1, 1.0]}
  end

  test "playerUi is excluded at every level, leaving an empty delta" do
    old = %{"playerUi" => %{"x" => 1}, "a" => %{"playerUi" => 1, "b" => 1}}
    new = %{"playerUi" => %{"x" => 2}, "a" => %{"playerUi" => 2, "b" => 1}}
    assert GameUI.fast_delta(old, new) == %{"a" => %{}}
    assert_same_delta(old, new)
    assert GameUI.fast_delta(%{"playerUi" => 1}, %{"playerUi" => 2}) == %{}
    assert_same_delta(%{"playerUi" => 1}, %{"playerUi" => 2})
  end

  test "maps replaced by non-maps and vice versa" do
    assert_same_delta(%{"a" => %{"b" => 1}}, %{"a" => nil})
    assert_same_delta(%{"a" => nil}, %{"a" => %{"b" => 1}})
    assert_same_delta(%{"a" => [%{"b" => 1}]}, %{"a" => [%{"b" => 2}]})
  end

  test "structs follow the MapDiff behavior" do
    assert_same_delta(%{"s" => MapSet.new([1, 2])}, %{"s" => MapSet.new([1, 3])})
    assert_same_delta(%{"s" => MapSet.new([1])}, %{"s" => MapSet.new([1])})
    assert_same_delta(%{"s" => MapSet.new([1])}, %{"s" => [1]})
  end

  test "get_delta ignores messages and fadeText from the old game" do
    old = %{"messages" => ["old"], "fadeText" => %{"x" => 1}, "a" => 1}
    new = %{"messages" => ["new"], "fadeText" => nil, "a" => 1}
    assert GameUI.get_delta(old, new) == %{"messages" => [[], ["new"]]}
  end

  # Randomized nested maps and mutations of them.
  defp random_value(depth) do
    case :rand.uniform(if depth > 3, do: 5, else: 7) do
      1 -> :rand.uniform(5)
      2 -> Enum.random(["a", "b", "c"])
      3 -> Enum.random([true, false, nil])
      4 -> Enum.map(1..:rand.uniform(3), fn _ -> :rand.uniform(3) end)
      5 -> :rand.uniform(3) * 1.0
      _ -> random_map(depth + 1)
    end
  end

  defp random_map(depth) do
    for _ <- 1..:rand.uniform(5), into: %{}, do: {Enum.random(["k1", "k2", "k3", "k4", "playerUi"]), random_value(depth)}
  end

  defp mutate(map, depth) when is_map(map) do
    key = Enum.random(["k1", "k2", "k3", "k4", "playerUi"])

    case :rand.uniform(4) do
      1 -> Map.delete(map, key)
      2 -> Map.put(map, key, random_value(depth))
      3 ->
        case Map.get(map, key) do
          sub when is_map(sub) -> Map.put(map, key, mutate(sub, depth + 1))
          _ -> map
        end
      _ -> map
    end
  end

  test "randomized maps match the legacy delta and round-trip through apply_delta" do
    :rand.seed(:exsss, {1, 2, 3})

    for _ <- 1..3000 do
      old = random_map(0)
      new = Enum.reduce(1..:rand.uniform(4), old, fn _, acc -> mutate(acc, 0) end)
      assert_same_delta(old, new)

      delta = GameUI.fast_delta(old, new)

      if is_map(delta) and not Map.has_key?(old, "playerUi") and not Map.has_key?(new, "playerUi") and
           not String.contains?(inspect(old) <> inspect(new), "playerUi") do
        assert GameUI.apply_delta(old, delta, "redo") == new
        assert GameUI.apply_delta(new, delta, "undo") == old
      end
    end
  end
end
