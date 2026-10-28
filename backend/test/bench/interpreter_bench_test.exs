defmodule DragnCardsGame.InterpreterBenchTest do
  @moduledoc """
  Interpreter benchmarks against the real LotR plugin. Excluded by default.

      mix test test/bench/interpreter_bench_test.exs --include bench

  Set BENCH_PROFILE=<workload name> to also print an :eprof profile of that
  workload, and BENCH_RUNS to change the number of timed runs per workload.
  """
  use ExUnit.Case, async: false
  alias DragnCardsGame.{Evaluate, GameUI, PluginGameHelper}

  @moduletag :bench
  @moduletag timeout: :infinity

  setup do
    :ok = Ecto.Adapters.SQL.Sandbox.checkout(DragnCards.Repo, ownership_timeout: :infinity)
    Ecto.Adapters.SQL.Sandbox.mode(DragnCards.Repo, {:shared, self()})
    :ok
  end

  defp loaded_game(game) do
    game
    |> Evaluate.evaluate(["LOAD_CARDS", "Q01.1"])
    |> Evaluate.evaluate(["LOAD_CARDS", "coreLeadership"])
  end

  defp four_player_game(game) do
    game = Evaluate.evaluate(game, [["SET", "/numPlayers", 4], ["LOAD_CARDS", "Q01.1"]])

    [{"player1", "coreLeadership"}, {"player2", "coreLore"}, {"player3", "coreSpirit"}, {"player4", "coreTactics"}]
    |> Enum.reduce(game, fn {player_n, deck}, acc ->
      Evaluate.evaluate(acc, [["DEFINE", "$PLAYER_N", player_n], ["LOAD_CARDS", deck]])
    end)
  end

  defp workloads(game, game_def, gameui) do
    loaded = loaded_game(game)
    four = four_player_game(game)
    hero_id = Evaluate.evaluate(four, ["GET_CARD_ID", "player1Play1", 0, 0])
    four_ui = put_in(gameui["game"], Map.drop(four, ["playerUi", "playerInfo"])) |> Map.merge(%{"deltas" => [], "replayStep" => -1})
    player_ui = %{"activeCardId" => hero_id, "playerN" => "player1"}

    [
      {"load_quest_and_deck", game, fn g -> loaded_game(g) end},
      {"skip_to_next_planning_x2", loaded, fn g ->
        g
        |> Evaluate.evaluate(game_def["actionLists"]["skipToNextPlanningPhase"])
        |> Evaluate.evaluate(game_def["actionLists"]["skipToNextPlanningPhase"])
      end},
      {"filter_cards_x50", loaded, fn g ->
        Enum.each(1..50, fn _ ->
          Evaluate.evaluate(g, ["FILTER_CARDS", "$CARD", ["EQUAL", "$CARD.sides.A.type", "Enemy"]])
        end)
      end},
      {"staging_threat_x50", loaded, fn g ->
        Enum.each(1..50, fn _ -> Evaluate.evaluate(g, ["COMPUTE_STAGING_THREAT"]) end)
      end},
      {"arith_loop_5000", game, fn g ->
        Evaluate.evaluate(g, [
          ["VAR", "$SUM", 0],
          ["FOR_EACH_START_STOP_STEP", "$I", 0, 5000, 1, [
            ["VAR", "$SUM", ["ADD", "$SUM", ["MULTIPLY", "$I", 2]]]
          ]]
        ])
      end},
      {"list_build_500", game, fn g ->
        Evaluate.evaluate(g, ["LIST" | Enum.to_list(1..500)])
      end},
      {"four_player_setup", game, fn g -> four_player_game(g) end},
      {"four_player_round", four, fn g ->
        g
        |> Evaluate.evaluate(game_def["actionLists"]["skipToRefreshPhase"])
        |> Evaluate.evaluate(game_def["actionLists"]["skipToNextPlanningPhase"])
      end},
      {"four_player_exhaust_x20", four, fn g ->
        Enum.reduce(1..20, g, fn _, acc ->
          Evaluate.evaluate(acc, [["DEFINE", "$ACTIVE_CARD_ID", hero_id], ["ACTION_LIST", "hotkeyA"]])
        end)
      end},
      {"game_action_with_delta_x10", four_ui, fn ui ->
        Enum.reduce(1..10, ui, fn _, acc ->
          new = GameUI.game_action(acc, nil, "evaluate", %{
            "action_list" => [["DEFINE", "$ACTIVE_CARD_ID", hero_id], ["ACTION_LIST", "hotkeyA"]],
            "player_ui" => player_ui,
            "description" => "bench"
          })
          GameUI.add_delta(new, acc)
        end)
      end},
      {"move_cards_x20", loaded, fn g ->
        Enum.reduce(1..20, g, fn _, acc ->
          card_id = Evaluate.evaluate(acc, ["GET_CARD_ID", "player1Hand", 0, 0])
          acc
          |> Evaluate.evaluate(["MOVE_CARD", card_id, "player1Play1", -1])
          |> Evaluate.evaluate(["MOVE_CARD", card_id, "player1Hand", -1])
        end)
      end}
    ]
  end

  defp median(list), do: list |> Enum.sort() |> Enum.at(div(length(list), 2))

  test "interpreter benchmarks" do
    case PluginGameHelper.lotr_paths() do
      nil ->
        IO.puts("LotR plugin not found; skipping benchmarks")

      {json, tsv} ->
        %{game: game, game_def: game_def, gameui: gameui} = PluginGameHelper.setup_game(json, tsv)
        runs = String.to_integer(System.get_env("BENCH_RUNS") || "7")
        profile = System.get_env("BENCH_PROFILE")

        if System.get_env("BENCH_SIZES") do
          four = four_player_game(game)
          hero_id = Evaluate.evaluate(four, ["GET_CARD_ID", "player1Play1", 0, 0])
          ui = put_in(gameui["game"], Map.drop(four, ["playerUi", "playerInfo"])) |> Map.merge(%{"deltas" => [], "replayStep" => -1})
          player_ui = %{"activeCardId" => hero_id, "playerN" => "player1"}
          ui =
            Enum.reduce(1..200, ui, fn i, acc ->
              code = if rem(i, 2) == 0, do: ["ACTION_LIST", "hotkeyA"], else: ["DRAW_CARD"]
              new = GameUI.game_action(acc, nil, "evaluate", %{"action_list" => [["DEFINE", "$ACTIVE_CARD_ID", hero_id], code], "player_ui" => player_ui, "description" => "x"})
              GameUI.add_delta(new, acc)
            end)
          words = fn t -> :erts_debug.flat_size(t) * 8 / 1_000_000 end
          IO.puts("4-player game: #{Float.round(words.(ui["game"]), 2)} MB; room state after 200 actions: #{Float.round(words.(ui), 2)} MB (deltas #{length(ui["deltas"])})")
          {copy_us, _} = :timer.tc(fn -> pid = spawn(fn -> receive do _ -> :ok end end); send(pid, ui) end)
          IO.puts("one copy of the room state to another process: #{copy_us / 1000} ms")
        end

        IO.puts("\n#{String.pad_trailing("workload", 28)} median_ms   min_ms")

        for {name, input, fun} <- workloads(game, game_def, gameui) do
          # warm up
          fun.(input)
          times = for _ <- 1..runs, do: elem(:timer.tc(fn -> fun.(input) end), 0) / 1000
          IO.puts(
            "#{String.pad_trailing(name, 28)} " <>
              "#{:io_lib.format("~9.1f", [median(times)])} #{:io_lib.format("~8.1f", [Enum.min(times)])}"
          )

          if profile == name do
            Mix.ensure_application!(:tools)
            :eprof.start()
            :eprof.profile([], fn -> fun.(input) end)
            :eprof.log(String.to_charlist(System.get_env("BENCH_PROFILE_OUT") || "/dev/stdout"))
            :eprof.analyze(:total, sort: :time)
            :eprof.stop()
          end
        end
    end
  end
end
