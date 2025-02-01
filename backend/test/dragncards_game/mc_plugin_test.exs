# NOTE: This files is specific to the Marvel Champions plugin. You must copy this file to a new file that is not tracked by git and edit it to match your plugin.

# This test file can be run via:
# cd backend
# export PLUGIN_JSON_PATH=/path/to/directory/containing/your/plugin/jsons/
# export PLUGIN_TSV_PATH=/path/to/directory/containing/your/plugin/tsvs/
# mix test test/dragncards_game/mc_plugin_test.exs

defmodule DragnCardsGame.McPluginTest do
  # ExUnit.Case module brings the functionality for testing in Elixir
  # async: true runs the tests concurrently
  use ExUnit.Case, async: true

  # Include DragnCardsWeb.ConnCase for web related tests
  use DragnCardsWeb.ConnCase

  # Create aliases for the different modules used in this file
  alias DragnCards.{Plugins, Repo}
  alias DragnCards.Users.User
  alias DragnCardsGame.{GameUI, Evaluate}
  alias Jason

  # Import Ecto.Query for database related operations
  import Ecto.Query

  # Import ExUnit.Callbacks for callback functionality in tests
  import ExUnit.Callbacks

  # Import helper functions
  alias DragnCardsUtil.{Merger}
  alias DragnCardsUtil.{TsvProcess}

  # Setup block for the tests, executed before each test run
  # NOTE: You shouldn't have to edit this setup block for your plugin.
  # It will create a test user and a test game for you to use in your tests.
  setup do
    # User attributes for creating a test user
    user_attrs = %{
      alias: "dev_user",
      email: "dev_user@example.com",
      password: "password",
      password_confirmation: "password",
      supporter_level: 1,
      language: "English",
      plugin_settings: %{}
    }

    # Create a changeset for user creation
    changeset = User.changeset(%User{}, user_attrs)

    # Try to insert the user into the database
    case Repo.insert(changeset) do
      {:ok, user} ->
        # If the user was inserted successfully, print and inspect the user
        IO.puts("User created successfully!")

        # Confirm the user's email by setting the confirmation time
        confirm_time = DateTime.utc_now()

        # Update the user's email confirmed time in the database
        from(p in User,
          where: p.id == ^user.id,
          update: [set: [email_confirmed_at: ^confirm_time]]
        )
        |> Repo.update_all([])
        |> case do
          {1, nil} ->
            # If the update was successful, print a confirmation message
            IO.puts("Email Confirmed for user!")

          _ ->
            # If the update was not successful, print a failure message
            IO.puts("Email NOT Confirmed for user!")
        end

      {:error, changeset} ->
        # If the user creation failed, print and inspect the errors
        IO.puts("Failed to create user:")
        IO.inspect(changeset.errors)
    end

    # Retrieve the created user
    user = Repo.one(from u in User, limit: 1)

    # Set up plugin JSON paths
    plugin_json_path = System.get_env("PLUGIN_JSON_PATH")
    #plugin_json_path = Application.get_env(:dragncards, :plugin_json_path)

    # Get list of all JSON files from the plugin_json_path
    filenames = Path.wildcard(Path.join(plugin_json_path, "*.json"))

    # Merge all JSON files
    game_def = Merger.merge_json_files(filenames)

    # Get list of .tsv files from plugin_tsv_path
    plugin_tsv_path = System.get_env("PLUGIN_TSV_PATH")
    filenames = Path.wildcard(Path.join(plugin_tsv_path, "*.tsv"))

    # Process each .tsv file and merge them into a card_db
    card_db = Enum.reduce(filenames, %{}, fn(filename, acc) ->
      IO.puts("Processing #{filename}")
      rows = File.stream!(filename)
      |> Stream.map(&String.split(&1, "\t"))
      |> Enum.to_list()

      temp_db = TsvProcess.process_rows(game_def, rows)
      Merger.deep_merge([acc, temp_db])
    end)

    # Plugin parameters for creation
    plugin_params = %{
      "name" => game_def["pluginName"],
      "author_id" => user.id,
      "game_def" => game_def,
      "card_db" => card_db,
      "public" => true,
    }

    # Create a plugin
    Plugins.create_plugin(plugin_params)

    # Retrieve the created plugin and print its name
    plugin = Repo.one(from p in Plugins.Plugin, limit: 1)
    IO.puts("Plugin: #{plugin.name}")

    # Create a game with given options
    options = %{
      "privacyType" => "public",
      "pluginId" => plugin.id,
      "pluginVersion" => plugin.version,
      "language" => "English"
    }

    # Create a new game UI with options
    gameui = GameUI.new("room-slug-1234", user.id, options)

    # Extract the game from the game UI
    game = gameui["game"]

    # Set the player UI for the game
    player_ui = %{
      "activeCardId" => "",
      "playerN" => "player1"
    }

    # Update the game state with the player UI
    game = game |> put_in(["playerUi"], player_ui)

    # Return the setup data to be used in tests
    {:ok, %{user: user, game: game, game_def: plugin.game_def, card_db: plugin.card_db}}
  end

  @tag :loading_decks
  # These tests are plugin-specific. You will need to overwite them, but they are here as a starting point.
  test "Loading Decks", %{user: _user, game: game, game_def: game_def} do

    # Load some decks into the game
    res = Evaluate.evaluate(game, ["LOAD_CARDS", "Phoenix"])

    # Check that the deck was loaded
    assert length(res["groupById"]["player1Play1"]["stackIds"]) == 2

    # Check hand size limit
    assert res["playerData"]["player1"]["handSize"] == 6

    # Check hit points
    assert res["playerData"]["player1"]["hitPoints"] == 9

    # Check number of cards in hand
    assert length(res["groupById"]["player1Hand"]["stackIds"]) == 6

    # Get Jean Grey
    card_db_id = "2c1d1f38-fe42-504d-9e70-b0112062f399"
    card = Evaluate.evaluate(res, ["ONE_CARD", "$CARD", ["EQUAL", "$CARD.databaseId", card_db_id]])

    card_id = card["id"]
    assert res["cardById"][card_id]["currentSide"] == "A"

    # Make it active
    res = put_in(res["playerUi"]["activeCardId"], card_id)

    # Flip the card
    res = Evaluate.evaluate(res, game_def["actionLists"]["flipCard"])
    assert res["cardById"][card_id]["currentSide"] == "B"
    assert res["playerData"]["player1"]["handSize"] == 5
    res = Evaluate.evaluate(res, game_def["actionLists"]["flipCard"])
    assert res["cardById"][card_id]["currentSide"] == "A"
    assert res["playerData"]["player1"]["handSize"] == 6

    # Load an encounter deck
    res = Evaluate.evaluate(res, ["LOAD_CARDS", "Thanos"])

    # Confirm encounter deck
    assert length(res["groupById"]["sharedEncounterDeck"]["stackIds"]) == 15

    # Reveal encounter card
    res = Evaluate.evaluate(res, game_def["actionLists"]["dealEncounterFacedown"])
    assert length(res["groupById"]["player1Engaged"]["stackIds"]) == 1
    assert length(res["groupById"]["sharedEncounterDeck"]["stackIds"]) == 14

    # Check exhaust/ready
    res = Evaluate.evaluate(res, game_def["actionLists"]["toggleExhaust"])
    assert res["cardById"][card_id]["exhausted"] == true
    assert res["cardById"][card_id]["rotation"] == 90
    res = Evaluate.evaluate(res, game_def["actionLists"]["toggleExhaust"])
    assert res["cardById"][card_id]["exhausted"] == false
    assert res["cardById"][card_id]["rotation"] == 0

    # Check drawCard
    res = Evaluate.evaluate(res, game_def["actionLists"]["drawCard"])
    assert length(res["groupById"]["player1Hand"]["stackIds"]) == 7

    # Move a card in hand to the table
    card_from_hand = GameUI.get_card_by_group_id_stack_index_card_index(res, ["player1Hand", 0, 0])
    res = Evaluate.evaluate(res, ["MOVE_CARD", card_from_hand["id"], "player1Play1", -1])
    assert length(res["groupById"]["player1Hand"]["stackIds"]) == 6

    # Make it active
    res = put_in(res["playerUi"]["activeCardId"], card_from_hand["id"])

    # Check shuffleIntoDeck
    deck_size_before = length(res["groupById"]["player1Deck"]["stackIds"])
    res = Evaluate.evaluate(res, game_def["actionLists"]["shuffleIntoDeck"])
    deck_size_after = length(res["groupById"]["player1Deck"]["stackIds"])
    assert deck_size_after == deck_size_before + 1

  end

  test "player setup", %{user: user, game: game, game_def: game_def} do
    res = Evaluate.evaluate(game, ["LOAD_CARDS", "Captain America"])

    assert res["playerData"]["player1"]["handSize"] == 6
    assert res["playerData"]["player1"]["hitPoints"] == 11
    assert length(res["groupById"]["player1Hand"]["stackIds"])
  end

  @tag :scenario_setup_standard
  test "scenario setup (standard)", %{user: user, game: game, game_def: game_def} do
    res = Evaluate.evaluate(game, ["LOAD_CARDS", "Brotherhood of Badoon"])

    assert res["villainHitPoints"] == 13

    stacks = res["groupById"]["sharedMainScheme"]["stackIds"]
    card_id = hd(res["stackById"][hd(stacks)]["cardIds"])
    assert res["cardById"][card_id]["tokens"]["threat"] == 2

    Enum.each %{"sharedMainScheme" => "1A", "sharedVillain" => "I", "sharedVillainDeck" => "II", "sharedVillainDiscard" => "III"}, fn {group, stage} ->
      stacks = res["groupById"][group]["stackIds"]
      assert length(stacks) == 1
      card_id = hd(res["stackById"][hd(stacks)]["cardIds"])
      assert res["cardById"][card_id]["sides"]["A"]["stage"] == stage
    end
  end

  @tag :scenario_setup_expert
  test "scenario setup (expert)", %{user: user, game: game, game_def: game_def} do
    res = Evaluate.evaluate(game, game_def["actionLists"]["setExpertMode"])
    res = Evaluate.evaluate(res, ["LOAD_CARDS", "Rhino"])

    assert res["villainHitPoints"] == 15

    Enum.each %{"sharedVillain" => "II", "sharedVillainDeck" => "III", "sharedVillainDiscard" => "I"}, fn {group, stage} ->
      stacks = res["groupById"][group]["stackIds"]
      if group == "sharedVillain" do
        assert length(stacks) == 2
      else
        assert length(stacks) == 1
      end
      card_id = hd(res["stackById"][hd(stacks)]["cardIds"])
      assert res["cardById"][card_id]["sides"]["A"]["stage"] == stage
    end
  end

  test "scenario setup (standard): double sided villain, single stage", %{user: user, game: game, game_def: game_def} do
    res = Evaluate.evaluate(game, ["LOAD_CARDS", "Escape the Museum"])

    assert res["villainHitPoints"] == 8

    stacks = res["groupById"]["sharedVillain"]["stackIds"]
    assert length(stacks) == 1
    card_id = hd(res["stackById"][hd(stacks)]["cardIds"])
    assert res["cardById"][card_id]["sides"]["A"]["stage"] == "A1"

    stacks = res["groupById"]["sharedVillainDeck"]["stackIds"]
    assert length(stacks) == 0

    stacks = res["groupById"]["sharedVillainDiscard"]["stackIds"]
    assert length(stacks) == 1
    card_id = hd(res["stackById"][hd(stacks)]["cardIds"])
    assert res["cardById"][card_id]["sides"]["A"]["stage"] == "B1"
  end

  @tag :double_sided_villain_expert
  test "scenario setup (expert): double sided villain, single stage", %{user: user, game: game, game_def: game_def} do
    res = Evaluate.evaluate(game, game_def["actionLists"]["setExpertMode"])
    res = Evaluate.evaluate(res, ["LOAD_CARDS", "Escape the Museum"])

    assert res["villainHitPoints"] == 10

    stacks = res["groupById"]["sharedVillain"]["stackIds"]
    assert length(stacks) == 1
    card_id = hd(res["stackById"][hd(stacks)]["cardIds"])
    assert res["cardById"][card_id]["sides"]["A"]["stage"] == "B1"

    stacks = res["groupById"]["sharedVillainDeck"]["stackIds"]
    assert length(stacks) == 0

    stacks = res["groupById"]["sharedVillainDiscard"]["stackIds"]
    assert length(stacks) == 1
    card_id = hd(res["stackById"][hd(stacks)]["cardIds"])
    assert res["cardById"][card_id]["sides"]["A"]["stage"] == "A1"
  end

  test "discard villain card", %{user: user, game: game, game_def: game_def} do
    res = Evaluate.evaluate(game, ["LOAD_CARDS", "Rhino"])

    stacks = res["groupById"]["sharedVillain"]["stackIds"]
    card_id = hd(res["stackById"][hd(stacks)]["cardIds"])
    res = put_in(res["playerUi"]["activeCardId"], card_id)

    res = Evaluate.evaluate(res, game_def["actionLists"]["discardCard"])

    stacks = res["groupById"]["sharedVillain"]["stackIds"]
    assert length(stacks) == 1
    card_id = hd(res["stackById"][hd(stacks)]["cardIds"])
    assert res["cardById"][card_id]["sides"]["A"]["stage"] == "II"

    stacks = res["groupById"]["sharedVillainDeck"]["stackIds"]
    assert length(stacks) == 0

    stacks = res["groupById"]["sharedVillainDiscard"]["stackIds"]
    assert length(stacks) == 2
  end

  @tag :discard_main_scheme
  test "discard main scheme card", %{user: user, game: game, game_def: game_def} do
    res = Evaluate.evaluate(game, ["LOAD_CARDS", "Brotherhood of Badoon"])

    stacks = res["groupById"]["sharedMainScheme"]["stackIds"]
    card_id = hd(res["stackById"][hd(stacks)]["cardIds"])
    res = put_in(res["playerUi"]["activeCardId"], card_id)

    res = Evaluate.evaluate(res, game_def["actionLists"]["discardCard"])

    stacks = res["groupById"]["sharedMainScheme"]["stackIds"]
    assert length(stacks) == 1
    card_id = hd(res["stackById"][hd(stacks)]["cardIds"])
    card = res["cardById"][card_id]
    assert card["sides"]["A"]["stage"] == "2A"
    assert card["tokens"]["threat"] == 4

    stacks = res["groupById"]["sharedMainSchemeDeck"]["stackIds"]
    assert length(stacks) == 0

    stacks = res["groupById"]["sharedMainSchemeDiscard"]["stackIds"]
    assert length(stacks) == 1
  end

  test "3-sided cards", %{user: _user, game: game, game_def: game_def} do

    # Load some decks into the game
    res = Evaluate.evaluate(game, ["LOAD_CARDS", "Ant-Man"])

    # Check number of cards in hand
    assert length(res["groupById"]["player1Hand"]["stackIds"]) == 6


    # Ant-Man
    card = Evaluate.evaluate(res, ["ONE_CARD", "$CARD", ["EQUAL", "$CARD.sides.C.name", "Ant-Man"]])
    card_id = card["id"]
    assert res["cardById"][card_id]["currentSide"] == "B"

    # Make it active
    res = put_in(res["playerUi"]["activeCardId"], card_id)

    # Toggle third side
    res = Evaluate.evaluate(res, game_def["actionLists"]["setSideC"])
    assert res["cardById"][card_id]["currentSide"] == "C"

    # Toggle third side
    res = Evaluate.evaluate(res, game_def["actionLists"]["setSideB"])
    assert res["cardById"][card_id]["currentSide"] == "B"
  end

  @tag :reshuffle_when_empty
  test "Reshuffle encounter deck when empty", %{user: _user, game: game, game_def: _game_def} do

    # Load some decks into the game
    game = Evaluate.evaluate(game, ["LOAD_CARDS", "Rhino"])

    # Get number of encounter cards
    encounter_deck_size = length(game["groupById"]["sharedEncounterDeck"]["stackIds"])

    # Reveal and discard cards until the deck is empty
    game = Enum.reduce(game["groupById"]["sharedEncounterDeck"]["stackIds"], game, fn(_stack_id, acc) ->
      acc = Evaluate.evaluate(acc, ["ACTION_LIST", "dealEncounterFacedown"])
      Evaluate.evaluate(acc, [
        ["DEFINE", "$DISCARD_CARD_ID", ["GET_CARD_ID", "player1Engaged", 0, 0]],
        ["ACTION_LIST", "discardCard"]
      ])
    end)

    # Check the the deck is full again, less 1 card for the last revealed card
    assert length(game["groupById"]["sharedEncounterDeck"]["stackIds"]) == encounter_deck_size - 1

    # Check that the discard pile has 1 card in it
    assert length(game["groupById"]["sharedEncounterDiscard"]["stackIds"]) == 1

  end


  @tag :reshuffle_after_discard
  test "Reshuffle encounter deck after_discard", %{user: _user, game: game, game_def: _game_def} do

    # Load some decks into the game
    game = Evaluate.evaluate(game, ["LOAD_CARDS", "Rhino"])

    # Get number of encounter cards
    encounter_deck_size = length(game["groupById"]["sharedEncounterDeck"]["stackIds"])

    # Discard cards until the deck is empty
    game = Enum.reduce(game["groupById"]["sharedEncounterDeck"]["stackIds"], game, fn(_stack_id, acc) ->
      Evaluate.evaluate(acc, [
        ["DEFINE", "$DISCARD_CARD_ID", ["GET_CARD_ID", "sharedEncounterDeck", 0, 0]],
        ["ACTION_LIST", "discardCard"]
      ])
    end)

    # Check the the deck is full again
    assert length(game["groupById"]["sharedEncounterDeck"]["stackIds"]) == encounter_deck_size

  end

  @tag :reshuffle_player_deck
  test "Reshuffle player deck", %{user: _user, game: game, game_def: _game_def} do
    res = Evaluate.evaluate(game, ["LOAD_CARDS", "Spider-Man"])
    res = Evaluate.evaluate(res, ["LOAD_CARDS", "Rhino"])

    # Get number of encounter cards
    deck_size = length(res["groupById"]["player1Deck"]["stackIds"])

    # Discard cards until the deck is empty
    res = Enum.reduce(res["groupById"]["player1Deck"]["stackIds"], res, fn(_stack_id, acc) ->
      Evaluate.evaluate(acc, [
        ["DEFINE", "$DISCARD_CARD_ID", ["GET_CARD_ID", "player1Deck", 0, 0]],
        ["ACTION_LIST", "discardCard"]
      ])
    end)

    # Check the the deck is full again
    assert length(res["groupById"]["player1Deck"]["stackIds"]) == deck_size

    assert length(res["groupById"]["player1Engaged"]["stackIds"]) == 1
  end

  @tag :draw_full_hand
  test "Draws Full Hand Even if Deck Needs to be Shuffled", %{user: _user, game: game, game_def: game_def} do
    res = Evaluate.evaluate(game, ["LOAD_CARDS", "Spider-Man"])
    res = Evaluate.evaluate(res, ["LOAD_CARDS", "Rhino"])

    deck_size = length(res["groupById"]["player1Deck"]["stackIds"])

    # Discard cards until the deck is empty
    res = Enum.reduce(res["groupById"]["player1Deck"]["stackIds"], res, fn(_stack_id, acc) ->
      Evaluate.evaluate(acc, [
        ["COND",
          ["GREATER_THAN", ["LENGTH", "$GAME.groupById.player1Deck.stackIds"], 3],
          [
            ["DEFINE", "$DISCARD_CARD_ID", ["GET_CARD_ID", "player1Deck", 0, 0]],
            ["ACTION_LIST", "discardCard"]
          ]
        ]
      ])
    end)

    res = Enum.reduce(res["groupById"]["player1Hand"]["stackIds"], res, fn(_stack_id, acc) ->
      Evaluate.evaluate(acc, [
        ["COND",
          ["GREATER_THAN", ["LENGTH", "$GAME.groupById.player1Hand.stackIds"], 1],
          [
            ["DEFINE", "$DISCARD_CARD_ID", ["GET_CARD_ID", "player1Hand", 0, 0]],
            ["ACTION_LIST", "discardCard"]
          ]
        ]
      ])
    end)

    res = Evaluate.evaluate(res, game_def["actionLists"]["playerEndPhase"])

    # Check the player has a full hand
    assert length(res["groupById"]["player1Hand"]["stackIds"]) == res["playerData"]["player1"]["handSize"]
    # Check the the deck is full again
    assert length(res["groupById"]["player1Deck"]["stackIds"]) == deck_size
  end

  @tag :side_quest_starting_threat
  test "Side Quest spawns with starting threat", %{user: _user, game: game, game_def: _game_def} do
    # Get Breakin' & Takin'
    card_db_id = "89399b59-bb97-5eef-81f5-7bf8c8194b15"
    res = Evaluate.evaluate(game, ["LOAD_CARDS", ["LIST", %{"databaseId" => card_db_id, "loadGroupId" => "sharedVillain", "quantity" => 1}]])

    card = Evaluate.evaluate(res, ["ONE_CARD", "$CARD", ["EQUAL", "$CARD.databaseId", card_db_id]])
    card_id = card["id"]
    assert res["cardById"][card_id]["tokens"]["threat"] == 2

    # Get Light at the End
    card_db_id = "de9f3efd-51ca-51e0-a354-9241b482c1b8"
    res = Evaluate.evaluate(game, ["LOAD_CARDS", ["LIST", %{"databaseId" => card_db_id, "loadGroupId" => "sharedVillain", "quantity" => 1}]])
    card = Evaluate.evaluate(res, ["ONE_CARD", "$CARD", ["EQUAL", "$CARD.databaseId", card_db_id]])
    card_id = card["id"]
    assert res["cardById"][card_id]["tokens"]["threat"] == 20
  end

  @tag :player_end_phase
  test "Player End Phase", %{user: _user, game: game, game_def: game_def} do
    res = Evaluate.evaluate(game, ["LOAD_CARDS", "Rhino"])
    res = Evaluate.evaluate(res, ["LOAD_CARDS", "Captain America"])

    # get Captain America Card
    hero_card_db_id = "64dfc6fe-1e66-5cef-b68d-2fd8e8b0d80d"
    hero_card = Evaluate.evaluate(res, ["ONE_CARD", "$CARD", ["EQUAL", "$CARD.databaseId", hero_card_db_id]])
    # flip and exhaust Hero Card
    res = put_in(res["playerUi"]["activeCardId"], hero_card["id"])
    res = Evaluate.evaluate(res, game_def["actionLists"]["flipCard"])
    res = Evaluate.evaluate(res, game_def["actionLists"]["toggleExhaust"])
    # discard cards in hand
    res = Enum.reduce([0, 1, 2], res, fn(_, acc) ->
      Evaluate.evaluate(acc, [
        ["DEFINE", "$ACTIVE_CARD_ID", ["GET_CARD_ID", "player1Hand", 0, 0]],
        ["ACTION_LIST", "discardCard"]
      ])
    end)

    # Get Main Scheme Card
    main_scheme_card_db_id = "53f44777-cf8a-565d-bd34-6c9657c47bce"
    main_scheme_card = Evaluate.evaluate(res, ["ONE_CARD", "$CARD", ["EQUAL", "$CARD.databaseId", main_scheme_card_db_id]])
    # Add Acceleration Token
    res = Evaluate.evaluate(res, ["INCREASE_VAL", "/cardById/#{main_scheme_card["id"]}/tokens/acceleration", 1])
    # Add Threat
    res = Evaluate.evaluate(res, ["INCREASE_VAL", "/cardById/#{main_scheme_card["id"]}/tokens/threat", 2])

    # Trigger end of player phase
    res = Evaluate.evaluate(res, game_def["actionLists"]["playerEndPhase"])

    # check draw up to hand size
    assert length(res["groupById"]["player1Hand"]["stackIds"]) == 5

    # check exhausted cards are readied
    assert res["cardById"][hero_card["id"]]["rotation"] == 0

    # check acceleration threat has been placed
    assert res["cardById"][main_scheme_card["id"]]["tokens"]["threat"] == 4
  end

  @tag :villain_encounter_phase
  test "Villain Encounter Phase", %{user: _user, game: game, game_def: game_def} do
    res = Evaluate.evaluate(game, ["LOAD_CARDS", "Rhino"])
    res = Evaluate.evaluate(res, ["LOAD_CARDS", "Spider-Man"])

    res = Evaluate.evaluate(res, game_def["actionLists"]["villainEncounterPhase"])

    assert length(res["groupById"]["player1Engaged"]["stackIds"]) == 1
  end

  @tag :draw_boost
  test "Draw Boost Card", %{user: _user, game: game, game_def: game_def} do
    res = Evaluate.evaluate(game, ["LOAD_CARDS", "Rhino"])

    res = Evaluate.evaluate(res, game_def["actionLists"]["drawBoost"])
    card = Evaluate.evaluate(res, [
      ["DEFINE", "$CARD_ID", ["GET_CARD_ID", "player1Engaged", 0, 0]],
      ["ONE_CARD", "$CARD", ["EQUAL", "$CARD.id", "$CARD_ID"]]
    ])

    assert card["currentSide"] == "B"
    assert card["rotation"] == -30
  end

  @tag :side_scheme_boost
  test "Side Scheme as Boost Card", %{user: _user, game: game, game_def: game_def} do
    # Get Breakin' & Takin'
    card_db_id = "89399b59-bb97-5eef-81f5-7bf8c8194b15"
    # Get Ivory Horn
    card2_db_id = "16f27f91-8904-5ecd-9985-1a23dc866d1c"
    res = Evaluate.evaluate(game, ["LOAD_CARDS", ["LIST", %{"databaseId" => card_db_id, "loadGroupId" => "sharedEncounterDeck", "quantity" => 1}, %{"databaseId" => card2_db_id, "loadGroupId" => "sharedEncounterDeck", "quantity" => 1}]])

    card = Evaluate.evaluate(res, ["ONE_CARD", "$CARD", ["EQUAL", "$CARD.databaseId", card_db_id]])
    card_id = card["id"]
    res = Evaluate.evaluate(res, ["MOVE_CARD", card_id, "sharedEncounterDeck", 0])
    res = Evaluate.evaluate(res, game_def["actionLists"]["drawBoost"])

    assert !res["cardById"][card_id]["tokens"]["threat"]
  end

  @tag :side_scheme_encounter_threat
  test "Side Scheme Drawn as Encounter Card Doesn't Get Threat Until Flipped", %{user: _user, game: game, game_def: game_def} do
    # Get Breakin' & Takin'
    card_db_id = "89399b59-bb97-5eef-81f5-7bf8c8194b15"
    # Get Ivory Horn
    card2_db_id = "16f27f91-8904-5ecd-9985-1a23dc866d1c"
    res = Evaluate.evaluate(game, ["LOAD_CARDS", ["LIST", %{"databaseId" => card_db_id, "loadGroupId" => "sharedEncounterDeck", "quantity" => 1}, %{"databaseId" => card2_db_id, "loadGroupId" => "sharedEncounterDeck", "quantity" => 1}]])

    card = Evaluate.evaluate(res, ["ONE_CARD", "$CARD", ["EQUAL", "$CARD.databaseId", card_db_id]])
    card_id = card["id"]
    res = Evaluate.evaluate(res, ["MOVE_CARD", card_id, "sharedEncounterDeck", 0])
    res = Evaluate.evaluate(res, game_def["actionLists"]["dealEncounterFacedown"])

    assert res["cardById"][card_id]["groupId"] == "player1Engaged"
    assert !res["cardById"][card_id]["tokens"]["threat"]
  end

  @tag :magog_standard
  test "Double Sided A/B Villain Standard (MaGog)", %{user: _user, game: game, game_def: game_def} do
    res = Evaluate.evaluate(game, ["LOAD_CARDS", "MaGog"])
    card_id = "4e8aa2b5-0752-53fc-9f52-ec75312c00f3"
    magog = Evaluate.evaluate(res, ["ONE_CARD", "$CARD", ["EQUAL", "$CARD.databaseId", card_id]])

    assert magog["currentSide"] == "A"
  end

  @tag :magog_expert
  test "Double Sided A/B Villain Expert (MaGog)", %{user: _user, game: game, game_def: game_def} do
    res = Evaluate.evaluate(game, game_def["actionLists"]["setExpertMode"])
    res = Evaluate.evaluate(res, ["LOAD_CARDS", "MaGog"])
    card_id = "4e8aa2b5-0752-53fc-9f52-ec75312c00f3"
    magog = Evaluate.evaluate(res, ["ONE_CARD", "$CARD", ["EQUAL", "$CARD.databaseId", card_id]])

    assert magog["currentSide"] == "B"
  end

  @tag :shadows_of_the_past
  test "Shadows of the Past Action", %{user: _user, game: game, game_def: game_def} do
    res = Evaluate.evaluate(game, ["LOAD_CARDS", "Captain America"])
    res = Evaluate.evaluate(res, game_def["actionLists"]["shadowsOfThePast"])

    assert length(res["groupById"]["player1NemesisSet"]["stackIds"]) == 0
    assert length(res["groupById"]["player1Engaged"]["stackIds"]) == 1
    assert length(res["groupById"]["sharedVillain"]["stackIds"]) == 1
    # already has obligation card in the encounter deck
    assert length(res["groupById"]["sharedEncounterDeck"]["stackIds"]) == 4
  end

  @tag :shadows_of_the_past_venom
  test "Shadows of the Past deals out multiple minions", %{user: _user, game: game, game_def: game_def} do
    res = Evaluate.evaluate(game, ["LOAD_CARDS", "Venom (Hero)"])
    res = Evaluate.evaluate(res, game_def["actionLists"]["shadowsOfThePast"])

    assert length(res["groupById"]["player1NemesisSet"]["stackIds"]) == 0
    assert length(res["groupById"]["player1Engaged"]["stackIds"]) == 4
    assert length(res["groupById"]["sharedVillain"]["stackIds"]) == 1
    # already has obligation card in the encounter deck
    assert length(res["groupById"]["sharedEncounterDeck"]["stackIds"]) == 1
  end

  @tag :invocation_deck
  test "Invocation Deck", %{user: _user, game: game, game_def: game_def} do
    res = Evaluate.evaluate(game, ["LOAD_CARDS", "Doctor Strange"])

    assert length(res["groupById"]["player1Deck2"]["stackIds"]) == 5
  end

  @tag :weather_deck
  test "Weather Deck", %{user: _user, game: game, game_def: game_def} do
    res = Evaluate.evaluate(game, ["LOAD_CARDS", "Storm"])

    # 4 weather cards + 1 identity card
    assert length(res["groupById"]["player1Play1"]["stackIds"]) == 5
  end

  @tag :player_permanent
  test "Player Permanent Cards", %{user: _user, game: game, game_def: game_def} do
    res = Evaluate.evaluate(game, ["LOAD_CARDS", "Vision"])

    assert length(res["groupById"]["player1Play1"]["stackIds"]) == 2
  end

  @tag :campaign_permanent
  test "Campaign Permanent Cards", %{user: _user, game: game, game_def: game_def} do
    res = Evaluate.evaluate(game, ["LOAD_CARDS", "Campaign - S.H.I.E.L.D. Tech"])

    assert length(res["groupById"]["player1Play1"]["stackIds"]) == 0
  end

  @tag :multiple_double_sided_villains
  test "Multiple Double Sided Villains", %{user: _user, game: game, game_def: game_def} do
    res = Evaluate.evaluate(game, ["LOAD_CARDS", "Morlock Siege"])

    assert length(res["groupById"]["sharedVillain"]["stackIds"]) == 1
  end

  @tag :scenario_required_modulars
  test "Scenario Required Modulars", %{user: _user, game: game, game_def: game_def} do
    res = Evaluate.evaluate(game, ["LOAD_CARDS", "Infiltrate the Museum"])

    assert length(res["groupById"]["sharedEncounterDeck"]["stackIds"]) == 18
  end

  @tag :remove_all_tokens_leaves_play
  test "Removes All Toknes when Card Leaves Play", %{user: _user, game: game, game_def: game_def} do
    # Get Breakin' & Takin'
    card_db_id = "89399b59-bb97-5eef-81f5-7bf8c8194b15"
    # Get Ivory Horn
    card2_db_id = "16f27f91-8904-5ecd-9985-1a23dc866d1c"
    res = Evaluate.evaluate(game, ["LOAD_CARDS", ["LIST", %{"databaseId" => card_db_id, "loadGroupId" => "sharedEncounterDeck", "quantity" => 1}, %{"databaseId" => card2_db_id, "loadGroupId" => "sharedEncounterDeck", "quantity" => 2}]])

    card = Evaluate.evaluate(res, ["ONE_CARD", "$CARD", ["EQUAL", "$CARD.databaseId", card_db_id]])
    card_id = card["id"]
    res = Evaluate.evaluate(res, ["MOVE_CARD", card_id, "player1Engaged", 0])
    res = Evaluate.evaluate(res, ["INCREASE_VAL", "/cardById/#{card_id}/tokens/threat", 2])

    res = put_in(res["playerUi"]["activeCardId"], card_id)
    res = Evaluate.evaluate(res, game_def["actionLists"]["discardCard"])

    assert !res["cardById"][card_id]["tokens"]["threat"]
  end

  @tag :discard_minion
  test "Discard Minion", %{user: _user, game: game, game_def: game_def} do
    res = Evaluate.evaluate(game, ["LOAD_CARDS", "Rhino"])

    res = Evaluate.evaluate(res, [
      ["DEFINE", "$GROUP_ID", "player1Engaged"],
      ["ACTION_LIST", "discardMinion"]
    ])

    #IO.puts length(res["groupById"]["sharedEncounterDeck"]["parentCardIds"])
    assert length(res["groupById"]["player1Engaged"]["stackIds"]) == 1
  end
end
