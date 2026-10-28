defmodule DragnCardsWeb.RoomChannelGameActionTest do
  @moduledoc """
  End-to-end test of the game_action flow through a real room channel and
  game server, using the LotR plugin (skipped if it is not available).
  """
  use ExUnit.Case, async: false
  use Phoenix.ChannelTest
  alias DragnCardsGame.{GameUI, GameUIServer, GameUISupervisor, PluginGameHelper}

  @endpoint DragnCardsWeb.Endpoint

  setup do
    :ok = Ecto.Adapters.SQL.Sandbox.checkout(DragnCards.Repo, ownership_timeout: :infinity)
    Ecto.Adapters.SQL.Sandbox.mode(DragnCards.Repo, {:shared, self()})
    :ok
  end

  defp start_room(user, game) do
    slug = "test-room-#{System.unique_integer([:positive])}"

    {:ok, _pid} =
      GameUISupervisor.start_game(slug, user, %{
        "privacyType" => "public",
        "pluginId" => game["pluginId"],
        "pluginVersion" => game["pluginVersion"],
        "language" => "English",
        "pluginName" => game["pluginName"]
      })

    slug
  end

  defp join_room(user, slug) do
    {:ok, _, socket} =
      DragnCardsWeb.UserSocket
      |> socket("user_socket:#{user.id}", %{user_id: user.id, auth_failed: false})
      |> subscribe_and_join(DragnCardsWeb.RoomChannel, "room:" <> slug)

    assert_push("current_state", _state)
    socket
  end

  defp action(socket, slug, action_list) do
    before = GameUIServer.state(slug)

    ref =
      push(socket, "game_action", %{
        "action" => "evaluate",
        "options" => %{
          "action_list" => action_list,
          "player_ui" => %{"playerN" => "player1", "activeCardId" => nil},
          "description" => "test action"
        },
        "timestamp" => 0
      })

    assert_reply(ref, :ok, "game_action", 30_000)
    assert_push("state_update", payload, 30_000)
    after_state = GameUIServer.state(slug)
    {before, payload, after_state}
  end

  test "game actions broadcast the right delta and replay steps, and undo works" do
    case PluginGameHelper.lotr_paths() do
      nil ->
        IO.puts("LotR plugin not found; skipping")

      {json, tsv} ->
        %{user: user, game: game} = PluginGameHelper.setup_game(json, tsv)
        slug = start_room(user, game)

        try do
          GameUIServer.set_seat(slug, user.id, "player1", user.id)
          socket = join_room(user, slug)
          start_step = GameUIServer.state(slug)["replayStep"]

          for {action_list, i} <- Enum.with_index([
                [["LOAD_CARDS", "coreLeadership"]],
                [["DRAW_CARD"]],
                [["LOG", "hello"], ["SET", "/playerData/player1/threat", 33]]
              ]) do
            {before, payload, after_state} = action(socket, slug, action_list)
            step = start_step + i + 1

            assert payload["oldReplayStep"] == before["replayStep"]
            assert payload["oldReplayStep"] == step - 1
            assert payload["newReplayStep"] == step
            assert after_state["replayStep"] == step
            assert length(after_state["deltas"]) == step + 1
            assert payload["player_n"] == "player1"
            assert payload["delta"] == List.last(after_state["deltas"])

            expected = GameUI.legacy_delta(
              before["game"] |> Map.put("messages", []) |> Map.put("fadeText", nil),
              after_state["game"]
            )
            assert Map.delete(payload["delta"], "_delta_metadata") == expected
            assert payload["delta"]["_delta_metadata"]["log_messages"] == after_state["game"]["messages"]
          end

          final = GameUIServer.state(slug)
          assert final["game"]["playerData"]["player1"]["threat"] == 33
          assert final["game"]["messages"] |> Enum.any?(&(&1 =~ "hello"))

          # Undo the last action through the channel.
          ref = push(socket, "step_through", %{"options" => %{"size" => "single", "direction" => "undo"}})
          assert_reply(ref, :ok, "step_through", 30_000)
          assert_push("go_to_replay_step", undo_payload, 30_000)
          undone = GameUIServer.state(slug)
          assert undo_payload["oldReplayStep"] == start_step + 3
          assert undo_payload["newReplayStep"] == start_step + 2
          assert undone["game"]["playerData"]["player1"]["threat"] == 29

          # And redo it.
          ref = push(socket, "step_through", %{"options" => %{"size" => "single", "direction" => "redo"}})
          assert_reply(ref, :ok, "step_through", 30_000)
          assert_push("go_to_replay_step", _redo_payload, 30_000)
          assert GameUIServer.state(slug)["game"]["playerData"]["player1"]["threat"] == 33

          # The state saved for crash recovery is the latest one.
          [{^slug, saved}] = :ets.lookup(:game_uis, slug)
          assert saved["replayStep"] == GameUIServer.state(slug)["replayStep"]
        after
          GameUISupervisor.stop_game(slug)
        end
    end
  end

  test "query returns parts of the state and raises errors in the caller" do
    case PluginGameHelper.lotr_paths() do
      nil ->
        :ok

      {json, tsv} ->
        %{user: user, game: game} = PluginGameHelper.setup_game(json, tsv)
        slug = start_room(user, game)

        try do
          assert GameUIServer.query(slug, & &1["roomSlug"]) == slug
          assert GameUIServer.query(slug, &Map.keys/1) == Map.keys(GameUIServer.state(slug))
          assert_raise ArithmeticError, fn -> GameUIServer.query(slug, fn _ -> 1 / 0 end) end
          # The server survives a failing query.
          assert GameUIServer.query(slug, & &1["roomSlug"]) == slug
          assert GameUIServer.query("no-such-room", & &1) == nil
        after
          GameUISupervisor.stop_game(slug)
        end
    end
  end
end
