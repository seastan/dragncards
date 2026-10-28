defmodule DragnCardsWeb.ChannelBenchTest do
  @moduledoc """
  Times game actions through the room channel (including the game server and
  undo deltas) in a 4-player LotR room with a long history. Excluded by
  default:

      mix test test/bench/channel_bench_test.exs --include bench
  """
  use ExUnit.Case, async: false
  use Phoenix.ChannelTest
  alias DragnCardsGame.{GameUIServer, GameUISupervisor, PluginGameHelper}

  @endpoint DragnCardsWeb.Endpoint
  @moduletag :bench
  @moduletag timeout: :infinity

  setup do
    :ok = Ecto.Adapters.SQL.Sandbox.checkout(DragnCards.Repo, ownership_timeout: :infinity)
    Ecto.Adapters.SQL.Sandbox.mode(DragnCards.Repo, {:shared, self()})
    :ok
  end

  defp action(socket, action_list, player_n) do
    ref =
      push(socket, "game_action", %{
        "action" => "evaluate",
        "options" => %{
          "action_list" => action_list,
          "player_ui" => %{"playerN" => player_n, "activeCardId" => nil},
          "description" => "bench"
        },
        "timestamp" => 0
      })

    assert_reply(ref, :ok, _, 60_000)
    assert_push("state_update", _payload, 60_000)
  end

  test "channel game_action timing" do
    {json, tsv} = PluginGameHelper.lotr_paths() || raise "LotR plugin not found"
    %{user: user, game: game} = PluginGameHelper.setup_game(json, tsv)
    slug = "bench-room-#{System.unique_integer([:positive])}"

    {:ok, _} =
      GameUISupervisor.start_game(slug, user, %{
        "privacyType" => "public",
        "pluginId" => game["pluginId"],
        "pluginVersion" => game["pluginVersion"],
        "language" => "English",
        "pluginName" => game["pluginName"]
      })

    try do
      GameUIServer.set_seat(slug, user.id, "player1", user.id)

      {:ok, _, socket} =
        DragnCardsWeb.UserSocket
        |> socket("user_socket:#{user.id}", %{user_id: user.id, auth_failed: false})
        |> subscribe_and_join(DragnCardsWeb.RoomChannel, "room:" <> slug)

      assert_push("current_state", _)

      action(socket, [["SET", "/numPlayers", 4], ["LOAD_CARDS", "Q01.1"]], "player1")

      for {p, deck} <- [{"player1", "coreLeadership"}, {"player2", "coreLore"}, {"player3", "coreSpirit"}, {"player4", "coreTactics"}] do
        action(socket, [["LOAD_CARDS", deck]], p)
      end

      draw_and_return = [
        ["DRAW_CARD"],
        ["MOVE_CARD", "$GAME.groupById.player1Hand.parentCardIds.[0]", "player1Deck", -1]
      ]

      # Build up some undo history.
      for _ <- 1..150, do: action(socket, draw_and_return, "player1")

      if out = System.get_env("BENCH_PROFILE_OUT") do
        Mix.ensure_application!(:tools)
        :eprof.start()
        :eprof.start_profiling(Process.list())
        for _ <- 1..20, do: action(socket, draw_and_return, "player1")
        :eprof.stop_profiling()
        :eprof.log(String.to_charlist(out))
        :eprof.analyze(:total, sort: :time)
        :eprof.stop()
      end

      {us, _} = :timer.tc(fn -> for _ <- 1..50, do: action(socket, draw_and_return, "player1") end)
      state = GameUIServer.state(slug)
      IO.puts("\nchannel game_action: #{Float.round(us / 50 / 1000, 2)} ms per action (#{length(state["deltas"])} deltas in history)")
    after
      GameUISupervisor.stop_game(slug)
    end
  end
end
