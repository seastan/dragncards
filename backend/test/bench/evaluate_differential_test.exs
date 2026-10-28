defmodule DragnCardsGame.EvaluateDifferentialTest do
  @moduledoc """
  Differential test for interpreter changes. Runs every LotR action list and
  plugin function (plus a set of handwritten programs) against several real
  game states, and compares the normalized results with a golden file
  recorded from a known-good build. Excluded by default.

  Record on the known-good build:

      GOLDEN_RECORD=1 GOLDEN_PATH=/tmp/golden.etf \\
        mix test test/bench/evaluate_differential_test.exs --include differential

  Then compare on the changed build (same command without GOLDEN_RECORD).
  Set GOLDEN_LOOSE_ERRORS=1 to compare error messages only by their innermost
  message, ignoring trace formatting.
  """
  use ExUnit.Case, async: false
  alias DragnCardsGame.{Evaluate, PluginGameHelper, RandomId}

  @moduletag :differential
  @moduletag timeout: :infinity

  setup do
    :ok = Ecto.Adapters.SQL.Sandbox.checkout(DragnCards.Repo, ownership_timeout: :infinity)
    Ecto.Adapters.SQL.Sandbox.mode(DragnCards.Repo, {:shared, self()})
    :ok
  end

  @seed {:exsss, {11, 22, 33}}
  @uuid4 ~r/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
  @uuid4_anywhere ~r/[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/

  # ---------------------------------------------------------------------------
  # Normalization: strip values that legitimately differ between runs.

  def normalize(%DateTime{}), do: "<datetime>"
  def normalize(%MapSet{} = s), do: {:mapset, s |> MapSet.to_list() |> Enum.map(&normalize/1) |> Enum.sort()}

  def normalize(map) when is_map(map) do
    cond do
      map_size(map) > 0 and Enum.all?(Map.keys(map), &uuid4?/1) ->
        {:uuid_map, map |> Map.values() |> Enum.map(&normalize/1) |> Enum.sort()}

      true ->
        Map.new(map, fn
          {k, _v} when k in ["timestamp", "triggeredTimestamp", "createdAt"] -> {k, "<time>"}
          {"messageByTimestamp", v} when is_map(v) ->
            {"messageByTimestamp", v |> Map.values() |> Enum.map(&normalize/1) |> Enum.sort()}
          {k, v} -> {k, normalize(v)}
        end)
    end
  end

  def normalize(list) when is_list(list), do: Enum.map(list, &normalize/1)
  def normalize(s) when is_binary(s) do
    if String.contains?(s, "-"), do: Regex.replace(@uuid4_anywhere, s, "<uuid>"), else: s
  end
  def normalize(other), do: other

  defp uuid4?(s), do: is_binary(s) and Regex.match?(@uuid4, s)

  # Deep diff from a to b: list of {path, new_value | :deleted}
  def diff(a, b, path \\ [])
  def diff(a, b, _path) when a === b, do: []

  def diff(a, b, path) when is_map(a) and is_map(b) and not is_struct(a) and not is_struct(b) do
    keys = MapSet.union(MapSet.new(Map.keys(a)), MapSet.new(Map.keys(b))) |> Enum.sort()

    Enum.flat_map(keys, fn k ->
      case {Map.fetch(a, k), Map.fetch(b, k)} do
        {{:ok, va}, {:ok, vb}} -> diff(va, vb, path ++ [k])
        {{:ok, _}, :error} -> [{path ++ [k], :deleted}]
        {:error, {:ok, vb}} -> [{path ++ [k], vb}]
      end
    end)
  end

  def diff(_a, b, path), do: [{path, b}]

  # ---------------------------------------------------------------------------
  # Running programs

  def run(game, code) do
    task =
      Task.async(fn ->
        RandomId.deterministic!(500_000)
        :rand.seed(elem(@seed, 0), elem(@seed, 1))

        try do
          {:ok, Evaluate.evaluate(game, code)}
        rescue
          e -> {:error, Exception.message(e)}
        end
      end)

    case Task.yield(task, 20_000) || Task.shutdown(task, :brutal_kill) do
      {:ok, res} -> res
      nil -> {:error, "<timeout>"}
    end
  end

  def summarize(input_norm, {:ok, result}) do
    if Evaluate.is_game(result) do
      check_delta(input_norm, normalize(result))
      {:game, diff(input_norm, normalize(result))}
    else
      {:value, normalize(result)}
    end
  end

  def summarize(_input_norm, {:error, msg}), do: {:error, msg}

  # The undo/redo delta for every real state change must match the MapDiff one.
  defp check_delta(old, new) do
    fast = DragnCardsGame.GameUI.fast_delta(old, new)
    legacy = DragnCardsGame.GameUI.legacy_delta(old, new)
    if fast != legacy, do: Process.put(:delta_mismatches, (Process.get(:delta_mismatches) || 0) + 1)
  end

  # Advance a state by running code, raising on error (used to build states).
  defp step!(game, code) do
    case run(game, code) do
      {:ok, g} -> g
      {:error, msg} -> raise "state construction failed: #{msg}"
    end
  end

  defp set_player_count(game, num) do
    {_uuid, prompt} =
      Enum.find(game["playerData"]["player1"]["prompts"], fn {_, p} -> p["promptId"] == "setPlayerCount" end)

    step!(game, Enum.at(prompt["options"], num - 1)["code"])
  end

  defp first_card_id(game, group_id) do
    case get_in(game, ["groupById", group_id, "stackIds"]) do
      [stack_id | _] -> hd(game["stackById"][stack_id]["cardIds"])
      _ -> nil
    end
  end

  defp states(game) do
    fresh = game

    setup =
      game
      |> set_player_count(2)
      |> step!(["LOAD_CARDS", "coreLeadership"])
      |> step!([["DEFINE", "$PLAYER_N", "player2"], ["LOAD_CARDS", "coreLore"]])
      |> step!(["LOAD_CARDS", "Q01.1"])

    questing =
      setup
      |> step!(["DO_ADVANCE_BUTTON"])
      |> step!([
        ["DEFINE", "$ACTIVE_CARD_ID", "$GAME.groupById.player1Play1.parentCardIds.[0]"],
        ["ACTION_LIST", "toggleCommit"]
      ])
      |> step!(["ACTION_LIST", "revealEncounter"])

    [{"fresh", fresh}, {"setup", setup}, {"questing", questing}]
  end

  defp handwritten_programs do
    [
      ["LIST", 1, "a", ["ADD", 1, 2], "$PLAYER_N", "{{$PLAYER_N}}-x"],
      [["VAR", "$X", 3], ["VAR", "$Y", ["MULTIPLY", "$X", 4]], ["LOG", "{{$X}} {{$Y}}"]],
      ["FILTER_CARDS", "$CARD", ["EQUAL", "$CARD.sides.A.type", "Enemy"]],
      ["FILTER_CARDS", "$CARD", ["AND", "$CARD.inPlay", ["EQUAL", "$CARD.controller", "player1"]]],
      ["ONE_CARD", "$CARD", ["EQUAL", "$CARD.groupId", "player1Hand"]],
      ["LENGTH", "$GAME.groupById.player1Deck.stackIds"],
      "$GAME.groupById.player1Hand.parentCardIds",
      "$GAME.groupById.sharedStagingArea.parentCards",
      "$GAME.groupById.player1Play1.parentCardIds.[0]",
      "$GAME.groupById.player1Play1.parentCardIds.[-1]",
      "$ACTIVE_CARD.currentFace.name",
      "$ACTIVE_CARD.sides.A",
      "$ALIAS_N",
      "$PLAYER_ORDER",
      "$ACTIVE_GROUP_ID",
      "/cardById/$ACTIVE_CARD_ID/rotation",
      ["SET", "/cardById/$ACTIVE_CARD_ID/rotation", 90],
      ["SET", "/cardById/$ACTIVE_CARD_ID/exhausted", true],
      ["SET", "/cardById/$ACTIVE_CARD_ID/tokens/damage", 3],
      ["SET", "/cardById/$ACTIVE_CARD_ID/tokens/progress", ["ADD", "$ACTIVE_CARD.tokens.progress", 2]],
      ["MOVE_CARD", "$ACTIVE_CARD_ID", "player1Discard", 0],
      ["MOVE_CARD", "$ACTIVE_CARD_ID", "player1Play1", -1],
      ["MOVE_CARD", "$ACTIVE_CARD_ID", "sharedStagingArea", 0],
      ["MOVE_CARD", "$ACTIVE_CARD_ID", "player1Deck", 0],
      ["DRAW_CARD"],
      ["DRAW_CARD", 3],
      ["SHUFFLE_GROUP", "player1Deck"],
      ["FOR_EACH_VAL", "$CARD_ID", "$GAME.groupById.player1Hand.parentCardIds", [
        ["SET", "/cardById/$CARD_ID/rotation", 90]
      ]],
      ["FOR_EACH_KEY_VAL", "$K", "$V", "$GAME.playerData", [["LOG", "{{$K}}"]]],
      ["FOR_EACH_START_STOP_STEP", "$I", 0, 5, 1, [["LOG", "{{$I}}"]]],
      [["VAR", "$I", 0], ["WHILE", ["LESS_THAN", "$I", 4], [["INCREASE_VAR", "$I", 1]]], ["LOG", "{{$I}}"]],
      ["COND", ["EQUAL", 1, 2], "a", ["EQUAL", 1, 1], "b", true, "c"],
      ["COND", false, ["LOG", "no"], true, ["LOG", "yes"]],
      ["IF", true, "a", "b"],
      ["COMPUTE_STAGING_THREAT"],
      ["NEXT_PLAYER", "player1"],
      ["GET_ALIAS", "player1"],
      ["UNDEFINED_THING_123"],
      [1, 2, 3],
      "$NOT_A_VAR",
      ["ADD", "x", 1],
      ["SET", "/nope/nope/nope", 1],
      ["MOVE_CARD", nil, "player1Hand", 0]
    ]
  end

  defp function_programs(game_def) do
    (game_def["functions"] || %{})
    # Loops until a trigger appears, so it only ever ends by timing out.
    |> Map.delete("ADVANCE_THROUGH_ROUND_BUT_STOP_AT_TRIGGERS")
    |> Enum.sort()
    |> Enum.map(fn {name, func} ->
      args =
        (func["args"] || [])
        |> Enum.reject(&is_map/1)
        |> Enum.map(fn _ -> "$ACTIVE_CARD_ID" end)

      [name | args]
    end)
  end

  defp action_list_programs(game_def) do
    (game_def["actionLists"] || %{})
    |> Map.keys()
    |> Enum.sort()
    |> Enum.map(&["ACTION_LIST", &1])
  end

  defp corpus(game_def) do
    handwritten_programs() ++ action_list_programs(game_def) ++ function_programs(game_def)
  end

  defp results(game, game_def) do
    for {state_name, state} <- states(game),
        active_group <- [nil, "player1Hand", "player1Play1", "sharedStagingArea"],
        active_id = if(active_group, do: first_card_id(state, active_group)),
        active_group == nil or active_id != nil,
        state = put_in(state, ["playerUi", "activeCardId"], active_id),
        input_norm = normalize(state),
        {code, i} <- Enum.with_index(corpus(game_def)) do
      {{state_name, active_group, i, code}, summarize(input_norm, run(state, code))}
    end
  end

  @doc "Reduce an error message to its innermost message, without trace decoration."
  def error_core(msg) do
    msg
    |> String.split(" Trace: ")
    |> hd()
    |> String.split(~r/: (: )?/)
    |> List.last()
    |> String.trim()
  end

  defp same?({:error, a}, {:error, b}) do
    if System.get_env("GOLDEN_LOOSE_ERRORS") do
      # Exceptions without a message used to be shown inspected (%Foo{...});
      # they now use Exception.message/1.
      a == b or String.contains?(b, error_core(a)) or (String.starts_with?(a, ": %") and String.starts_with?(b, ": "))
    else
      a == b
    end
  end

  defp same?(a, b), do: a == b

  test "interpreter results match golden" do
    {json, tsv} = PluginGameHelper.lotr_paths() || raise "LotR plugin not found"
    path = System.get_env("GOLDEN_PATH") || raise "set GOLDEN_PATH"

    RandomId.deterministic!(0)
    :rand.seed(elem(@seed, 0), elem(@seed, 1))
    %{game: game, game_def: game_def} = PluginGameHelper.setup_game(json, tsv)
    # Warm the plugin cache so worker processes never need the DB.
    DragnCardsGame.PluginCache.refresh_plugin(game["pluginId"])

    results = results(game, game_def)
    IO.puts("\n#{length(results)} programs evaluated")
    assert (Process.get(:delta_mismatches) || 0) == 0, "fast_delta differs from MapDiff delta"
    counts = Enum.frequencies_by(results, fn {_, {kind, _}} -> kind end)
    IO.inspect(counts, label: "result kinds")

    if System.get_env("GOLDEN_RECORD") do
      File.write!(path, :erlang.term_to_binary(results, compressed: 9))
      IO.puts("recorded golden to #{path}")
    else
      golden = path |> File.read!() |> :erlang.binary_to_term() |> Map.new()
      assert map_size(golden) == length(results)

      mismatches =
        Enum.reject(results, fn {key, res} -> same?(Map.fetch!(golden, key), res) end)

      if System.get_env("GOLDEN_SHOW_ERRORS") do
        results
        |> Enum.filter(fn {_, res} -> elem(res, 0) == :error end)
        |> Enum.uniq_by(fn {_, {:error, msg}} -> error_core(msg) end)
        |> Enum.take(12)
        |> Enum.each(fn {key, {:error, msg}} ->
          {:error, old} = golden[key]
          IO.puts("\n=== #{inspect(elem(key, 3), limit: 8)}\nOLD: #{old}\nNEW: #{msg}")
        end)
      end

      for {key, res} <- Enum.take(mismatches, 10) do
        IO.puts("\n--- MISMATCH #{inspect(key, limit: 20)}")
        IO.puts("expected: #{inspect(golden[key], limit: 60, printable_limit: 600)}")
        IO.puts("actual:   #{inspect(res, limit: 60, printable_limit: 600)}")
      end

      assert mismatches == [], "#{length(mismatches)} of #{length(results)} programs differ from golden"
    end
  end
end
