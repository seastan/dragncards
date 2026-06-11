# Test file for the Star Wars Deckbuilding Game (SWDB) plugin.
#
# Run with:
# cd backend
# export PLUGIN_JSON_PATH=/home/cstanford@novateur.com/repos/other/dragncards-swdb-plugin/jsons/
# export PLUGIN_TSV_PATH=/home/cstanford@novateur.com/repos/other/dragncards-swdb-plugin/tsvs/
# mix test test/dragncards_game/swdb_plugin_test.exs

defmodule DragnCardsGame.SwdbPluginTest do
  use ExUnit.Case, async: false
  use DragnCardsWeb.ConnCase

  alias DragnCards.{Repo, Plugins}
  alias DragnCards.Users.User
  alias DragnCardsGame.{GameUI, Evaluate}

  import Ecto.Query
  import ExUnit.Callbacks

  alias DragnCardsUtil.{Merger, TsvProcess}

  # Selects the option at `option_index` for the first prompt matching `prompt_id`
  # in `player_n`'s prompt queue, then returns the resulting game state.
  def select_prompt_option(game, player_n, prompt_id, option_index) do
    prompts = game["playerData"][player_n]["prompts"]
    {_uuid, prompt} =
      Enum.find(prompts, fn {_uuid, p} -> p["promptId"] == prompt_id end)
    option = Enum.at(prompt["options"], option_index)
    Evaluate.evaluate(game, option["code"])
  end

  # Runs through the full SWDB game setup sequence:
  #   1. Player 1 faction: Galactic Republic   (selectFaction_p1 index 2)
  #   2. Player 2 faction: Separatist Alliance (selectFaction_p2_republic index 2)
  #   3. Neutral deck:     Clone Wars Neutral  (selectNeutralDeck index 1)
  #   4. Tutorial:         Skip               (tutorial index 1)
  def setup_game(game) do
    game = select_prompt_option(game, "player1", "selectFaction_p1", 2)
    game = select_prompt_option(game, "player1", "selectFaction_p2_republic", 2)
    game = select_prompt_option(game, "player1", "selectNeutralDeck", 1)
    game = select_prompt_option(game, "player1", "tutorial", 1)
    game
  end

  setup do
    user_attrs = %{
      alias: "dev_user",
      email: "dev_user@example.com",
      password: "password",
      password_confirmation: "password",
      supporter_level: 1,
      language: "English",
      plugin_settings: %{}
    }

    changeset = User.changeset(%User{}, user_attrs)

    case Repo.insert(changeset) do
      {:ok, user} ->
        confirm_time = DateTime.utc_now()
        from(p in User,
          where: p.id == ^user.id,
          update: [set: [email_confirmed_at: ^confirm_time]]
        )
        |> Repo.update_all([])
        |> case do
          {1, nil} -> :ok
          _ -> IO.puts("Email NOT Confirmed for user!")
        end

      {:error, changeset} ->
        IO.puts("Failed to create user:")
        IO.inspect(changeset.errors)
    end

    user = Repo.one(from u in User, limit: 1)

    plugin_json_path = System.get_env("PLUGIN_JSON_PATH")
    filenames = Path.wildcard(Path.join(plugin_json_path, "*.json"))
    game_def = Merger.merge_json_files(filenames)

    plugin_tsv_path = System.get_env("PLUGIN_TSV_PATH")
    filenames = Path.wildcard(Path.join(plugin_tsv_path, "*.tsv"))

    card_db = Enum.reduce(filenames, %{}, fn filename, acc ->
      rows =
        File.stream!(filename)
        |> Stream.map(&String.split(&1, "\t"))
        |> Enum.to_list()
      temp_db = TsvProcess.process_rows(game_def, rows)
      Merger.deep_merge([acc, temp_db])
    end)

    plugin_params = %{
      "name" => game_def["pluginName"],
      "author_id" => user.id,
      "game_def" => game_def,
      "card_db" => card_db,
      "public" => true,
    }

    Plugins.create_plugin(plugin_params)

    plugin = Repo.one(from p in Plugins.Plugin, limit: 1)
    IO.puts("Plugin: #{plugin.name}")

    options = %{
      "privacyType" => "public",
      "pluginId" => plugin.id,
      "pluginVersion" => plugin.version,
      "language" => "English",
      "pluginName" => plugin.name,
    }

    gameui = GameUI.new("room-slug-swdb-1234", user.id, options)
    game = gameui["game"]

    player_ui = %{
      "activeCardId" => "",
      "playerN" => "player1"
    }

    game = game |> put_in(["playerUi"], player_ui)
    game = game |> put_in(["playerInfo"], gameui["playerInfo"])

    {:ok, %{user: user, game: game, game_def: plugin.game_def, card_db: plugin.card_db}}
  end


  defp time(label, fun) do
    t0 = System.monotonic_time(:millisecond)
    result = fun.()
    ms = System.monotonic_time(:millisecond) - t0
    IO.puts("  #{String.pad_trailing(label, 40)} #{ms} ms")
    result
  end

  @tag :end_turn
  test "END_TURN timing", %{game: game} do
    game = setup_game(game)

    assert game["started"] == true, "Game should be started after setup"
    assert game["currentPlayer"] == "player1", "Player 1 should go first"

    game = Evaluate.evaluate(game, ["PLAY_ALL_CARDS", "$PLAYER_N"])

    start_time = System.monotonic_time(:millisecond)
    game = Evaluate.evaluate(game, ["END_TURN", "player1"])
    elapsed_ms = System.monotonic_time(:millisecond) - start_time

    IO.puts("\nEND_TURN total: #{elapsed_ms} ms")

    assert game["currentPlayer"] == "player2", "After END_TURN it should be player 2's turn"
  end

  # Manually steps through the same operations END_TURN performs, timing each
  # chunk individually to identify where the time is going.
  @tag :end_turn_steps
  test "END_TURN step-by-step timing", %{game: game} do
    game = setup_game(game)
    game = Evaluate.evaluate(game, ["PLAY_ALL_CARDS", "$PLAYER_N"])

    IO.puts("\nStep-by-step END_TURN breakdown (player1):")

    game = time("hide endTurnSuggestion + CLEAR_ATTACKERS", fn ->
      game
      |> then(&Evaluate.evaluate(&1, ["SET", "/playerData/player1/layout/tableButtons/endTurnSuggestion/visible", false]))
      |> then(&Evaluate.evaluate(&1, ["CLEAR_ATTACKERS", "player1"]))
    end)

    game = time("reset resources + player flags", fn ->
      game
      |> then(&Evaluate.evaluate(&1, ["SET", "/playerData/player1/resources", 0]))
      |> then(&Evaluate.evaluate(&1, ["SET", "/playerData/player1/exiledCardThisTurn", false]))
      |> then(&Evaluate.evaluate(&1, ["SET", "/playerData/player1/nextDroidPurchaseOnTopOfDeck", false]))
      |> then(&Evaluate.evaluate(&1, ["SET", "/playerData/player1/nextBountyHunterOrTrooperPurchaseToHand", false]))
      |> then(&Evaluate.evaluate(&1, ["SET", "/playerData/player1/nextPurchaseToHand", false]))
      |> then(&Evaluate.evaluate(&1, ["SET", "/playerData/player1/drawIfForceNeutralOnNextPurchase", false]))
      |> then(&Evaluate.evaluate(&1, ["SET", "/playerData/player1/bountyHuntUsingCost", false]))
      |> then(&Evaluate.evaluate(&1, ["SET", "/playerData/player1/bountyHuntCapitalShips", false]))
      |> then(&Evaluate.evaluate(&1, ["SET", "/playerData/player1/bountyHuntPurchaseOnDestroy", false]))
      |> then(&Evaluate.evaluate(&1, ["SET", "/playerData/player1/glavisDiscountAvailable", false]))
    end)

    game = time("FOR_EACH_KEY_VAL reset card flags", fn ->
      Evaluate.evaluate(game, [
        "FOR_EACH_KEY_VAL", "$CARD_ID", "$CARD", "$GAME.cardById",
        [
          ["SET", "/cardById/$CARD.id/hasAttackedThisTurn", false],
          ["SET", "/cardById/$CARD.id/abilityUsedThisTurn", false]
        ]
      ])
    end)

    game = time("discard cards from play (FOR_EACH_VAL)", fn ->
      Evaluate.evaluate(game, [
        "FOR_EACH_VAL", "$CARD_ID", "$GAME.groupById.player1Play.parentCardIds",
        [
          ["VAR", "$CARD", "$GAME.cardById.{{$CARD_ID}}"],
          ["COND",
            ["EQUAL", "$CARD.currentFace.type", "CapitalShip"],
            ["SET", "/cardById/$CARD.id/rotation", 0],
            ["TRUE"],
            ["DISCARD_CARD_ID", "$CARD_ID"]
          ]
        ]
      ])
    end)

    game = time("discard hand cards (FOR_EACH_VAL)", fn ->
      Evaluate.evaluate(game, [
        "FOR_EACH_VAL", "$CARD_ID", "$GAME.groupById.player1Hand.parentCardIds",
        [["DISCARD_CARD_ID", "$CARD_ID"]]
      ])
    end)

    game = time("DRAW_UP_TO_HAND_SIZE", fn ->
      Evaluate.evaluate(game, ["DRAW_UP_TO_HAND_SIZE", "player1"])
    end)

    game = time("advance turn + START_TURN player2", fn ->
      game
      |> then(&Evaluate.evaluate(&1, ["SET", "/currentPlayer", ["NEXT_PLAYER", "player1"]]))
      |> then(&Evaluate.evaluate(&1, ["NEXT_STEP"]))
      |> then(&Evaluate.evaluate(&1, ["START_TURN", "player2"]))
    end)

    assert game["currentPlayer"] == "player2"
  end

  @tag :set_cost
  test "per-SET cost baseline", %{game: game} do
    game = setup_game(game)
    game = Evaluate.evaluate(game, ["PLAY_ALL_CARDS", "$PLAYER_N"])

    card_count = map_size(game["cardById"])
    card_id = game["cardById"] |> Map.keys() |> hd()
    IO.puts("\nCards in cardById: #{card_count}")

    # 1. Raw Elixir put_in — pure immutable map copy cost, no DragnCards overhead
    {raw_put_in_us, _} = :timer.tc(fn ->
      put_in(game, ["cardById", card_id, "hasAttackedThisTurn"], false)
    end)
    IO.puts("Raw put_in cost:                    #{raw_put_in_us} µs")

    # 2. put_by_path only — adds path parsing + automation trie lookup on top of put_in
    {put_by_path_us, _} = :timer.tc(fn ->
      DragnCardsGame.PutByPath.put_by_path(game, ["cardById", card_id, "hasAttackedThisTurn"], false, [])
    end)
    IO.puts("PutByPath.put_by_path cost:         #{put_by_path_us} µs  (#{put_by_path_us - raw_put_in_us} µs over raw)")

    # 3. Full Evaluate.evaluate SET — adds path string parsing and evaluate dispatch
    {full_set_us, _} = :timer.tc(fn ->
      Evaluate.evaluate(game, ["SET", "/cardById/#{card_id}/hasAttackedThisTurn", false])
    end)
    IO.puts("Evaluate SET cost:                  #{full_set_us} µs  (#{full_set_us - put_by_path_us} µs over put_by_path)")

    IO.puts("Projected 2x#{card_count} full SETs:       #{round(2 * card_count * full_set_us / 1000)} ms")
    IO.puts("Projected 2x#{card_count} raw put_ins:     #{round(2 * card_count * raw_put_in_us / 1000)} ms")

    # How many rules does the trie return for a hasAttackedThisTurn path?
    path = ["cardById", card_id, "hasAttackedThisTurn"]
    {trie_us, matching_ids} = :timer.tc(fn ->
      DragnCardsGame.RuleMap.get_ids_by_paths([path], game["ruleMap"])
    end)
    IO.puts("\nRules matching hasAttackedThisTurn: #{length(matching_ids)}")
    Enum.each(matching_ids, fn id ->
      rule = get_in(game, ["ruleById", id])
      IO.puts("  rule id=#{id}  card=#{rule["this_id"]}  listenTo=#{inspect(rule["listenTo"])}")
    end)
    IO.puts("Trie lookup cost:                   #{trie_us} us")

    # How expensive is the automation check when we know there are no matching rules?
    {auto_us, _} = :timer.tc(fn ->
      DragnCardsGame.AutomationRules.apply_automation_rules_for_update_paths(
        game, game, [path], path, []
      )
    end)
    IO.puts("apply_automation_rules cost:        #{auto_us} us")

    # How much does put_by_path cost with automationEnabled: false?
    game_no_auto = put_in(game["automationEnabled"], false)
    {no_auto_us, _} = :timer.tc(fn ->
      DragnCardsGame.PutByPath.put_by_path(game_no_auto, ["cardById", card_id, "hasAttackedThisTurn"], false, [])
    end)
    IO.puts("put_by_path with automationEnabled=false: #{no_auto_us} us")
    IO.puts("Projected FOR_EACH_KEY_VAL with auto disabled: #{round(2 * card_count * no_auto_us / 1000)} ms")

    assert true
  end

  @tag :end_turn_fprof
  test "END_TURN fprof", %{game: game} do
    game = setup_game(game)
    game = Evaluate.evaluate(game, ["PLAY_ALL_CARDS", "$PLAYER_N"])

    output_path = ~c"end_turn_fprof.txt"

    :fprof.start()
    :fprof.trace([:start])
    Evaluate.evaluate(game, ["END_TURN", "player1"])
    :fprof.trace(:stop)
    :fprof.profile()
    :fprof.analyse([dest: output_path, sort: :own, totals: true, details: true])
    :fprof.stop()

    IO.puts("\nfprof output written to: #{output_path}")
    IO.puts("Top lines by own time (grep for lines with large 'OWN' column):")

    File.stream!(output_path)
    |> Stream.filter(&String.contains?(&1, "{"))
    |> Stream.reject(&String.contains?(&1, "0.000"))
    |> Enum.sort_by(fn line ->
      # Extract the OWN time value (third column) for sorting
      case Regex.run(~r/\[\s*([\d.]+)\]/, line) do
        [_, val] -> -String.to_float(val)
        _ -> 0.0
      end
    end)
    |> Enum.take(30)
    |> Enum.each(&IO.puts/1)

    assert true
  end
end
