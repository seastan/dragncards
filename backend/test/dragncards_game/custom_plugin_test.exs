# NOTE: This files is specific to the LotR LCG plugin. You must copy this file to a new file that is not tracked by git and edit it to match your plugin.

# This test file can be run via:
# cd backend
# export PLUGIN_JSON_PATH=/path/to/directory/containing/your/plugin/jsons/
# export PLUGIN_TSV_PATH=/path/to/directory/containing/your/plugin/tsvs/
# mix test test/dragncards_game/custom_plugin_test.exs

defmodule StringReplacer do
  def replace_placeholders(str, values) do
    # Use regex to find all occurrences of {0}, {1}, etc.
    Regex.replace(~r/\{(\d+)\}/, str, fn _, index ->
      # Convert the captured index to an integer and fetch the corresponding value from the list
      Enum.at(values, String.to_integer(index))
    end)
  end
end

defmodule DragnCardsGame.CustomPluginTest do
  # ExUnit.Case module brings the functionality for testing in Elixir
  # async: true runs the tests concurrently
  use ExUnit.Case, async: false

  # Include DragnCardsWeb.ConnCase for web related tests
  use DragnCardsWeb.ConnCase

  # Create aliases for the different modules used in this file
  alias ElixirSense.Providers.Eval
  alias DragnCards.{Repo, Replay, Plugins}
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
        #IO.puts("User created successfully!")
        #IO.inspect(user)

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
            # Do nothing if the update was successful
            :ok
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
      #IO.puts("Processing #{filename}")
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
      "language" => "English",
      "pluginName" => plugin.name,
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

    # Update the game state with the player info
    game = game |> put_in(["playerInfo"], gameui["playerInfo"])

    # Return the setup data to be used in tests
    {:ok, %{user: user, game: game, game_def: plugin.game_def, card_db: plugin.card_db}}
  end

  @tag :loading
  # These tests are plugin-specific. You will need to overwite them, but they are here as a starting point.
  test "Loading Decks", %{user: user, game: game} do

    # Load some decks into the game
    game = Evaluate.evaluate(game, ["LOAD_CARDS", "Q01.1"]) # Passage through Mirkwood
    game = Evaluate.evaluate(game, ["LOAD_CARDS", "coreLeadership"]) # Leadership core set deck

    # Get the number of cards in sharedStagingArea, assert that it equals 2
    assert length(game["groupById"]["sharedStagingArea"]["stackIds"]) == 2

    # Get the number of cards in player1Play1, assert that it equals 3
    assert length(game["groupById"]["player1Play1"]["stackIds"]) == 3

    # Get the number of cards in player1Hand, assert that it equals 6
    assert length(game["groupById"]["player1Hand"]["stackIds"]) == 6

    # Confirm starting threat
    assert game["playerData"]["player1"]["threat"] == 29

    # Load deck again
    game = Evaluate.evaluate(game, ["LOAD_CARDS", "coreLeadership"]) # Leadership core set deck
    assert game["playerData"]["player1"]["threat"] == 29


  end


  @tag :starting_threat
  test "starting_threat", %{user: user, game: game} do

    # Load some decks into the game
    game = Evaluate.evaluate(game, ["LOAD_CARDS", "starterElves"])
    assert game["playerData"]["player1"]["threat"] == 29


  end

  @tag :basics
  test "Basics", %{user: _user, game: game, game_def: game_def} do
    # Load some decks into the game
    game = Evaluate.evaluate(game, ["LOAD_CARDS", "N0B.01"]) # Quest

    # Check DEFINE/DEFINED command
    assert Evaluate.evaluate(game, ["DEFINED", "$PLAYER_N"]) == true
    assert Evaluate.evaluate(game, ["DEFINED", "$PLAYER_N2"]) == false
    assert Evaluate.evaluate(game, [["DEFINE", "$PLAYER_N", nil], ["DEFINED", "$PLAYER_N"]]) == false

  end


  @tag :filter_cards
  test "filter_cards", %{user: _user, game: game, game_def: game_def} do
    # Load some decks into the game
    game = Evaluate.evaluate(game, ["LOAD_CARDS", "N0B.01"]) # Quest
    filtered_cards  = Evaluate.evaluate(game, ["FILTER_CARDS", "$CARD", ["EQUAL", "$CARD.sides.A.type", "Enemy"]])
    assert length(filtered_cards) == 8

  end

  @tag :bug
  test "bug", %{user: _user, game: game, game_def: game_def} do

    # Load some decks into the game
    game = Evaluate.evaluate(game, ["LOAD_CARDS", "Q01.1"]) # Passage through Mirkwood
    game = Evaluate.evaluate(game, ["LOAD_CARDS", "coreLeadership"]) # Leadership core set deck
    assert length(game["groupById"]["player1Hand"]["stackIds"]) == 6
    assert length(game["groupById"]["player1Deck"]["stackIds"]) == 24
    assert game["playerData"]["player1"]["threat"] == 29

    # Get one of the cards
    aragorn_card_db_id = "51223bd0-ffd1-11df-a976-0801200c9001"
    aragorn_card = Evaluate.evaluate(game, ["VAR", "$CARD", ["ONE_CARD", "$CARD", ["EQUAL", "$CARD.databaseId", aragorn_card_db_id]]])
    IO.inspect(aragorn_card["variables"])

  end


  @tag :card_hotkeys
  test "Card Hotkeys", %{user: _user, game: game, game_def: game_def} do

    # Load some decks into the game
    game = Evaluate.evaluate(game, ["LOAD_CARDS", "Q01.1"]) # Passage through Mirkwood
    game = Evaluate.evaluate(game, ["LOAD_CARDS", "coreLeadership"]) # Leadership core set deck
    assert length(game["groupById"]["player1Hand"]["stackIds"]) == 6
    assert length(game["groupById"]["player1Deck"]["stackIds"]) == 24
    assert game["playerData"]["player1"]["threat"] == 29

    # Get one of the cards
    aragorn_card_db_id = "51223bd0-ffd1-11df-a976-0801200c9001"
    aragorn_card = Evaluate.evaluate(game, ["ONE_CARD", "$CARD", ["EQUAL", "$CARD.databaseId", aragorn_card_db_id]])
    aragorn_card_id = aragorn_card["id"]

    # Make it active
    game = put_in(game["playerUi"]["activeCardId"], aragorn_card_id)

    # Test out hotkeys

    # flipCard
    res = Evaluate.evaluate(game, game_def["actionLists"]["flipCard"])
    assert res["cardById"][aragorn_card_id]["currentSide"] == "B"
    res = Evaluate.evaluate(res, game_def["actionLists"]["flipCard"])
    assert res["cardById"][aragorn_card_id]["currentSide"] == "A"

    # drawCard
    res = Evaluate.evaluate(game, game_def["actionLists"]["drawCard"])
    assert length(res["groupById"]["player1Hand"]["stackIds"]) == 7

    # revealEncounterFaceup
    res = Evaluate.evaluate(game, game_def["actionLists"]["revealEncounterFaceup"])
    assert length(res["groupById"]["sharedStagingArea"]["stackIds"]) == 3
    card = GameUI.get_card_by_group_id_stack_index_card_index(res, ["sharedStagingArea", 2, 0])
    assert card["currentSide"] == "A"

    # revealEncounterFacedown
    res = Evaluate.evaluate(game, game_def["actionLists"]["revealEncounterFacedown"])
    assert length(res["groupById"]["sharedStagingArea"]["stackIds"]) == 3
    card = GameUI.get_card_by_group_id_stack_index_card_index(res, ["sharedStagingArea", 2, 0])
    assert card["currentSide"] == "B"

    # mulligan
    res = Evaluate.evaluate(game, game_def["actionLists"]["mulligan"])
    assert length(res["groupById"]["player1Hand"]["stackIds"]) == 6

    # newRound
    res = Evaluate.evaluate(game, game_def["actionLists"]["newRound"])
    assert length(res["groupById"]["player1Hand"]["stackIds"]) == 7
    assert GameUI.get_card_by_group_id_stack_index_card_index(res, ["player1Play1", 0, 0])["tokens"]["resource"] == 1
    assert GameUI.get_card_by_group_id_stack_index_card_index(res, ["player1Play1", 1, 0])["tokens"]["resource"] == 1
    assert GameUI.get_card_by_group_id_stack_index_card_index(res, ["player1Play1", 2, 0])["tokens"]["resource"] == 1
    assert res["playerData"]["player1"]["threat"] == 29 # first time doing newRound doesn't increase threat
    assert res["roundNumber"] == 1

    # Increase cards drawn
    res = Evaluate.evaluate(res, ["SET", "/playerData/player1/cardsDrawn", 4])

    res = Evaluate.evaluate(res, game_def["actionLists"]["newRound"])
    assert length(res["groupById"]["player1Hand"]["stackIds"]) == 11
    assert GameUI.get_card_by_group_id_stack_index_card_index(res, ["player1Play1", 0, 0])["tokens"]["resource"] == 2
    assert GameUI.get_card_by_group_id_stack_index_card_index(res, ["player1Play1", 1, 0])["tokens"]["resource"] == 2
    assert GameUI.get_card_by_group_id_stack_index_card_index(res, ["player1Play1", 2, 0])["tokens"]["resource"] == 2
    assert res["playerData"]["player1"]["threat"] == 30
    assert res["roundNumber"] == 2

    # Exhaust a card
    res = Evaluate.evaluate(game, game_def["actionLists"]["toggleExhaust"])
    assert Evaluate.evaluate(res, "$GAME.cardById.#{aragorn_card_id}.exhausted") == true
    assert Evaluate.evaluate(res, "$GAME.cardById.#{aragorn_card_id}.rotation") == 90

    # Refresh
    res = Evaluate.evaluate(game, game_def["actionLists"]["refresh"])
    assert Evaluate.evaluate(res, "$GAME.cardById.#{aragorn_card_id}.exhausted") == false
    assert Evaluate.evaluate(res, "$GAME.cardById.#{aragorn_card_id}.rotation") == 0
    assert Evaluate.evaluate(res, "$GAME.roundNumber") == 0
    assert Evaluate.evaluate(res, "$GAME.playerData.player1.threat") == 30
    assert Evaluate.evaluate(res, "$GAME.firstPlayer") == "player1"

    # Set player count
    res = Evaluate.evaluate(res, ["SET", "/numPlayers", 3])
    # Refresh again, make sure firstplayer token is passed correctly
    res = Evaluate.evaluate(res, game_def["actionLists"]["refresh"])
    assert Evaluate.evaluate(res, "$GAME.firstPlayer") == "player2"
    res = Evaluate.evaluate(res, game_def["actionLists"]["refresh"])
    assert Evaluate.evaluate(res, "$GAME.firstPlayer") == "player3"
    res = Evaluate.evaluate(res, game_def["actionLists"]["refresh"])
    assert Evaluate.evaluate(res, "$GAME.firstPlayer") == "player1"

    # Reveal Encounter
    num_in_staging = length(res["groupById"]["sharedStagingArea"]["stackIds"])
    res = Evaluate.evaluate(game, game_def["actionLists"]["revealEncounterFaceup"])
    assert length(res["groupById"]["sharedStagingArea"]["stackIds"]) == num_in_staging + 1
    assert GameUI.get_card_by_group_id_stack_index_card_index(res, ["sharedStagingArea", -1, 0])["currentSide"] == "A"
    res = Evaluate.evaluate(res, game_def["actionLists"]["revealEncounterFacedown"])
    assert length(res["groupById"]["sharedStagingArea"]["stackIds"]) == num_in_staging + 2
    assert GameUI.get_card_by_group_id_stack_index_card_index(res, ["sharedStagingArea", -1, 0])["currentSide"] == "B"

    # 2 player game. Move some enemies into engaged area
    res = game
    res = Evaluate.evaluate(res, ["SET", "/numPlayers", 2])
    res = Evaluate.evaluate(res, [["DEFINE", "$PLAYER_N", "player2"], ["LOAD_CARDS", "coreLeadership"]])

    #assert length(res["groupById"]["player2Hand"]["stackIds"]) == 6
    assert length(res["groupById"]["player2Deck"]["stackIds"]) == 24
    card = Evaluate.evaluate(res, ["ONE_CARD", "$CARD", ["EQUAL", "$CARD.sides.A.name", "Ungoliant's Spawn"]])
    res = Evaluate.evaluate(res, ["MOVE_CARD", card["id"], "player1Engaged", -1])
    card = Evaluate.evaluate(res, ["ONE_CARD", "$CARD", ["EQUAL", "$CARD.sides.A.name", "East Bight Patrol"]])
    res = Evaluate.evaluate(res, ["MOVE_CARD", card["id"], "player2Engaged", -1])
    card = Evaluate.evaluate(res, ["ONE_CARD", "$CARD", ["EQUAL", "$CARD.sides.A.name", "Black Forest Bats"]])
    res = Evaluate.evaluate(res, ["MOVE_CARD", card["id"], "player1Engaged", -1])
    card = Evaluate.evaluate(res, ["ONE_CARD", "$CARD", ["EQUAL", "$CARD.sides.A.name", "King Spider"]])
    res = Evaluate.evaluate(res, ["MOVE_CARD", card["id"], "player2Engaged", -1])
    assert length(res["groupById"]["player1Engaged"]["stackIds"]) == 2

    # Deal shadows

    ecard1 = GameUI.get_card_by_group_id_stack_index_card_index(res, ["sharedEncounterDeck", 0, 0])
    ecard2 = GameUI.get_card_by_group_id_stack_index_card_index(res, ["sharedEncounterDeck", 1, 0])
    ecard3 = GameUI.get_card_by_group_id_stack_index_card_index(res, ["sharedEncounterDeck", 2, 0])
    ecard4 = GameUI.get_card_by_group_id_stack_index_card_index(res, ["sharedEncounterDeck", 3, 0])

    res = Evaluate.evaluate(res, game_def["actionLists"]["dealShadows"])

    scard1 = GameUI.get_card_by_group_id_stack_index_card_index(res, ["player1Engaged", 0, 1])
    scard2 = GameUI.get_card_by_group_id_stack_index_card_index(res, ["player1Engaged", 1, 1])
    scard3 = GameUI.get_card_by_group_id_stack_index_card_index(res, ["player2Engaged", 1, 1])
    scard4 = GameUI.get_card_by_group_id_stack_index_card_index(res, ["player2Engaged", 0, 1])

    assert ecard1["id"] == scard1["id"]
    assert ecard2["id"] == scard2["id"]
    assert ecard3["id"] == scard3["id"]
    assert ecard4["id"] == scard4["id"]

    # Discard shadows
    res = Evaluate.evaluate(res, game_def["actionLists"]["discardShadows"])
    assert res["cardById"][scard1["id"]]["groupId"] == "sharedEncounterDiscard"
    assert res["cardById"][scard2["id"]]["groupId"] == "sharedEncounterDiscard"
    assert res["cardById"][scard3["id"]]["groupId"] == "sharedEncounterDiscard"
    assert res["cardById"][scard4["id"]]["groupId"] == "sharedEncounterDiscard"

    # Raise threat
    assert Evaluate.evaluate(res, "$GAME.playerData.player1.threat") == 29
    assert Evaluate.evaluate(res, "$GAME.playerData.player2.threat") == 29
    res = Evaluate.evaluate(res, game_def["actionLists"]["increaseThreatAll"])
    assert Evaluate.evaluate(res, "$GAME.playerData.player1.threat") == 30
    assert Evaluate.evaluate(res, "$GAME.playerData.player2.threat") == 30
    res = Evaluate.evaluate(res, game_def["actionLists"]["decreaseThreatAll"])
    assert Evaluate.evaluate(res, "$GAME.playerData.player1.threat") == 29
    assert Evaluate.evaluate(res, "$GAME.playerData.player2.threat") == 29

    res = Evaluate.evaluate(res, ["DEFINE", "$PLAYER_N", "player1"])
    res = Evaluate.evaluate(res, game_def["actionLists"]["increaseThreat"])
    assert Evaluate.evaluate(res, "$GAME.playerData.player1.threat") == 30
    assert Evaluate.evaluate(res, ["GET", "/playerData/player2/threat"]) == 29

  end

  @tag :load_player_deck
  test "load_player_deck", %{user: _user, game: game, game_def: _game_def} do

    game = Evaluate.evaluate(game, ["LOAD_CARDS", "coreLeadership"])
    assert length(game["groupById"]["player1Hand"]["stackIds"]) == 6

  end


  # 4 player game
  @tag :four_player
  test "4 player game", %{user: _user, game: game, game_def: _game_def} do

    # Load some decks into the game
    playerNs = ["player1", "player2", "player3", "player4"]
    game = Evaluate.evaluate(game, ["SET", "/numPlayers", 4])
    game = Evaluate.evaluate(game, ["LOAD_CARDS", "Q01.1"]) # Passage through Mirkwood

    game = Enum.reduce(playerNs, game, fn playerN, acc ->
      Evaluate.evaluate(acc, [["DEFINE", "$PLAYER_N", playerN], ["LOAD_CARDS", "coreLeadership"]])
    end)

    # Check that the game is set up correctly
    Enum.reduce(playerNs, game, fn playerN, acc ->
      assert length(acc["groupById"][playerN <> "Hand"]["stackIds"]) == 6
      assert length(acc["groupById"][playerN <> "Deck"]["stackIds"]) == 24
      assert acc["playerData"][playerN]["threat"] == 29
      acc
    end)

    # Get a card
    card_id_1 = Evaluate.evaluate(game, ["GET_CARD_ID", "player1Play1", 0, 0])

    # Exhaust it
    game = Evaluate.evaluate(game, [["DEFINE", "$ACTIVE_CARD_ID", card_id_1], ["ACTION_LIST", "toggleExhaust"]])
    assert Evaluate.evaluate(game, "$GAME.cardById." <> card_id_1 <> ".exhausted") == true

    # Lock it
    game = Evaluate.evaluate(game, [["DEFINE", "$ACTIVE_CARD_ID", card_id_1], ["ACTION_LIST", "togglePreventRefresh"]])
    assert Evaluate.evaluate(game, "$GAME.cardById." <> card_id_1 <> ".preventRefresh") == true

    # Get another card
    card_id_2 = Evaluate.evaluate(game, ["GET_CARD_ID", "player2Play1", 0, 0])

    # Exhaust it
    game = Evaluate.evaluate(game, [["DEFINE", "$ACTIVE_CARD_ID", card_id_2], ["ACTION_LIST", "toggleExhaust"]])
    assert Evaluate.evaluate(game, "$GAME.cardById." <> card_id_2 <> ".exhausted") == true


    # Call refresh action
    game = Evaluate.evaluate(game, [["DEFINE", "$PLAYER_N", "player1"], ["ACTION_LIST", "refresh"]])
    game = Evaluate.evaluate(game, [["DEFINE", "$PLAYER_N", "player2"], ["ACTION_LIST", "refresh"]])

    # Check that card 1 is not refreshed
    assert Evaluate.evaluate(game, "$GAME.cardById." <> card_id_1 <> ".exhausted") == true

    # Check that card 2 is refreshed
    assert Evaluate.evaluate(game, "$GAME.cardById." <> card_id_2 <> ".exhausted") == false

    # Calculate score
    card_id = Evaluate.evaluate(game, ["GET_CARD_ID", "player1Play1", 0, 0])
    game = Evaluate.evaluate(game, [["DEFINE", "$ACTIVE_CARD_ID", card_id], ["ACTION_LIST", "discardCard"]])
    card_id = Evaluate.evaluate(game, ["GET_CARD_ID", "player2Play1", 0, 0])
    card = Evaluate.evaluate(game, ["ONE_CARD", "$CARD", ["EQUAL", "$CARD.sides.A.name", "Chieftan Ufthak"]])
    game = Evaluate.evaluate(game, [["DEFINE", "$ACTIVE_CARD_ID", card["id"]], ["ACTION_LIST", "addToVictoryDisplay"]])
    game = Evaluate.evaluate(game, ["SET", "/cardById/" <> card_id <> "/tokens/damage", 3])
    game = Evaluate.evaluate(game, ["ACTION_LIST", "calculateScore"])

    # Print all messages
    Enum.each(game["messages"], fn message ->
      IO.puts(message)
    end)

  end


  # Moving cards
  @tag :moving_cards
  test "moving cards", %{user: _user, game: game, game_def: _game_def} do

    # Load some decks into the game
    game = Evaluate.evaluate(game, ["LOAD_CARDS", "Q01.1"]) # Passage through Mirkwood
    game = Evaluate.evaluate(game, ["LOAD_CARDS", "coreLeadership"]) # Leadership core set deck
    assert length(game["groupById"]["player1Hand"]["stackIds"]) == 6
    assert length(game["groupById"]["player1Deck"]["stackIds"]) == 24
    assert length(game["groupById"]["sharedMainQuest"]["stackIds"]) == 1

    card_id_1 = Evaluate.evaluate(game, ["GET_CARD_ID", "sharedMainQuest", 0, 0])

    # Get a stackId
    stackId = Enum.at(game["groupById"]["player1Hand"]["stackIds"], 2)
    Evaluate.evaluate(game, ["MOVE_STACK", stackId, "player1Hand", 0])

  end

  # Discard cards
  @tag :discard_cards
  test "discard cards", %{user: _user, game: game, game_def: _game_def} do

    # Load some decks into the game
    game = Evaluate.evaluate(game, ["LOAD_CARDS", "Q01.1"]) # Passage through Mirkwood
    game = Evaluate.evaluate(game, ["LOAD_CARDS", "coreLeadership"]) # Leadership core set deck
    assert length(game["groupById"]["player1Hand"]["stackIds"]) == 6
    assert length(game["groupById"]["player1Deck"]["stackIds"]) == 24
    assert length(game["groupById"]["sharedMainQuest"]["stackIds"]) == 1

    # Attach a player card and an encounter card to a hero
    card_id_1 = Evaluate.evaluate(game, ["GET_CARD_ID", "sharedEncounterDeck", 0, 0])
    card_id_2 = Evaluate.evaluate(game, ["GET_CARD_ID", "player1Deck", 0, 0])

    game = Evaluate.evaluate(game, ["MOVE_CARD", card_id_1, "player1Play1", 0, 1, %{"combine" => true}])
    game = Evaluate.evaluate(game, ["MOVE_CARD", card_id_2, "player1Play1", 0, 1, %{"combine" => true}])

    # Verify that the stack has 3 cards
    parent_card_id = Evaluate.evaluate(game, ["GET_CARD_ID", "player1Play1", 0, 0])
    stack_ids = game["groupById"]["player1Play1"]["stackIds"]
    stack_id_0 = Enum.at(stack_ids, 0)
    card_ids = game["stackById"][stack_id_0]["cardIds"]

    assert length(card_ids) == 3

    game_with_stack = game

    # Discard the stack
    game = Evaluate.evaluate(game, [["DEFINE", "$ACTIVE_CARD_ID", parent_card_id], ["ACTION_LIST", "discardCard"]])

    # Print all messages
    Enum.each(game["messages"], fn message ->
      IO.puts(message)
    end)

    assert length(game["groupById"]["player1Discard"]["stackIds"]) == 2
    assert length(game["groupById"]["sharedEncounterDiscard"]["stackIds"]) == 1

    # Discard the quest
    card_id = Evaluate.evaluate(game, ["GET_CARD_ID", "sharedMainQuest", 0, 0])
    game = Evaluate.evaluate(game, [["DEFINE", "$ACTIVE_CARD_ID", card_id], ["ACTION_LIST", "discardCard"]])
    assert length(game["groupById"]["sharedMainQuest"]["stackIds"]) == 1
    assert length(game["groupById"]["sharedQuestDeck"]["stackIds"]) == 2
    card_id = Evaluate.evaluate(game, ["GET_CARD_ID", "sharedMainQuest", 0, 0])
    game = Evaluate.evaluate(game, [["DEFINE", "$ACTIVE_CARD_ID", card_id], ["ACTION_LIST", "discardCard"]])
    assert length(game["groupById"]["sharedMainQuest"]["stackIds"]) == 1
    assert length(game["groupById"]["sharedQuestDeck"]["stackIds"]) == 1
    card_id = Evaluate.evaluate(game, ["GET_CARD_ID", "sharedMainQuest", 0, 0])
    game = Evaluate.evaluate(game, [["DEFINE", "$ACTIVE_CARD_ID", card_id], ["ACTION_LIST", "discardCard"]])
    assert length(game["groupById"]["sharedMainQuest"]["stackIds"]) == 1
    assert length(game["groupById"]["sharedQuestDeck"]["stackIds"]) == 0
    card_id = Evaluate.evaluate(game, ["GET_CARD_ID", "sharedMainQuest", 0, 0])
    game = Evaluate.evaluate(game, [["DEFINE", "$ACTIVE_CARD_ID", card_id], ["ACTION_LIST", "discardCard"]])
    assert length(game["groupById"]["sharedMainQuest"]["stackIds"]) == 0

    # Discard just one card from the stack
    game = game_with_stack
    card_id = Evaluate.evaluate(game, ["GET_CARD_ID", "player1Play1", 0, 1])
    game = Evaluate.evaluate(game, [["DEFINE", "$ACTIVE_CARD_ID", card_id], ["ACTION_LIST", "discardCard"]])
    assert length(game["groupById"]["player1Discard"]["stackIds"]) == 1
    assert length(game["groupById"]["sharedEncounterDiscard"]["stackIds"]) == 0
    # Verify that the stack has 2 cards
    parent_card_id = Evaluate.evaluate(game, ["GET_CARD_ID", "player1Play1", 0, 0])
    stack_ids = game["groupById"]["player1Play1"]["stackIds"]
    stack_id_0 = Enum.at(stack_ids, 0)
    card_ids = game["stackById"][stack_id_0]["cardIds"]
    assert length(card_ids) == 2

  end

  # Load Specific card
  @tag :load_specific
  test "load_specific", %{user: _user, game: game, game_def: _game_def} do

    # Load some specific cards
    game = Evaluate.evaluate(game, ["LOAD_CARDS", ["LIST", %{"databaseId" => "da365fcc-385e-4824-901a-30381b769561", "loadGroupId" => "player1Deck", "quantity" => 1}]])
    assert length(game["groupById"]["player1Deck"]["stackIds"]) == 1

  end

  # Celeborn
  @tag :celeborn
  test "Celeborn", %{user: _user, game: game, game_def: _game_def} do

    # Load Celeborn
    game = Evaluate.evaluate(game, ["LOAD_CARDS", ["LIST", %{"databaseId" => "4c4cccd3-576a-41f1-8b6c-ba11b4cc3d4b", "loadGroupId" => "player1Play1", "quantity" => 1}]])
    assert length(game["groupById"]["player1Play1"]["stackIds"]) == 1

    # Load Naith Guide
    game = Evaluate.evaluate(game, ["LOAD_CARDS", ["LIST", %{"databaseId" => "dad6e885-d535-4100-bd9f-4726ea7c7465", "loadGroupId" => "player1Hand", "quantity" => 1}]])
    assert length(game["groupById"]["player1Hand"]["stackIds"]) == 1

    # Move Naith Guide to the table
    naith_card_id = Evaluate.evaluate(game, ["GET_CARD_ID", "player1Hand", 0, 0])
    game = Evaluate.evaluate(game, ["MOVE_CARD", naith_card_id, "player1Play1", 1, 0])
    assert length(game["groupById"]["player1Play1"]["stackIds"]) == 2
    assert game["cardById"][naith_card_id]["tokens"]["willpower"] == 1
    assert game["cardById"][naith_card_id]["tokens"]["attack"] == 1
    assert game["cardById"][naith_card_id]["tokens"]["defense"] == 1

    # Load Itilien Lookout
    game = Evaluate.evaluate(game, ["LOAD_CARDS", ["LIST", %{"databaseId" => "86edf661-e3d8-4372-9325-f2d2d5ac354a", "loadGroupId" => "player1Hand", "quantity" => 1}]])
    assert length(game["groupById"]["player1Hand"]["stackIds"]) == 1

    # Move Itilien Lookout
    lookout_card_id = Evaluate.evaluate(game, ["GET_CARD_ID", "player1Hand", 0, 0])
    game = Evaluate.evaluate(game, ["MOVE_CARD", lookout_card_id, "player1Play1", 1, 0])
    assert length(game["groupById"]["player1Play1"]["stackIds"]) == 3
    assert game["cardById"][lookout_card_id]["tokens"]["willpower"] == nil
    assert game["cardById"][lookout_card_id]["tokens"]["attack"] == nil
    assert game["cardById"][lookout_card_id]["tokens"]["defense"] == nil

    # New Round
    game = Evaluate.evaluate(game, ["ACTION_LIST", "newRound"])
    assert game["cardById"][naith_card_id]["tokens"]["willpower"] == 0
    assert game["cardById"][naith_card_id]["tokens"]["attack"] == 0
    assert game["cardById"][naith_card_id]["tokens"]["defense"] == 0

    # New Round
    game = Evaluate.evaluate(game, ["ACTION_LIST", "newRound"])


    # Print all messages
    Enum.each(game["messages"], fn message ->
      IO.puts(message)
    end)

  end

  # Dain
  @tag :dain
  test "Dain", %{user: _user, game: game, game_def: _game_def} do

    # Load Dain
    game = Evaluate.evaluate(game, ["LOAD_CARDS", ["LIST", %{"databaseId" => "51223bd0-ffd1-11df-a976-0801206c9005", "loadGroupId" => "player1Play1", "quantity" => 1}]])
    assert length(game["groupById"]["player1Play1"]["stackIds"]) == 1
    dain_card_id = Evaluate.evaluate(game, ["GET_CARD_ID", "player1Play1", 0, 0])
    assert game["cardById"][dain_card_id]["tokens"]["willpower"] == 1
    assert game["cardById"][dain_card_id]["tokens"]["attack"] == 1

    # Load dwarf ally
    game = Evaluate.evaluate(game, ["LOAD_CARDS", ["LIST", %{"databaseId" => "51223bd0-ffd1-11df-a976-0801207c9085", "loadGroupId" => "player1Hand", "quantity" => 1}]])
    assert length(game["groupById"]["player1Hand"]["stackIds"]) == 1

    # Move ally to the table
    dwarf_card_id = Evaluate.evaluate(game, ["GET_CARD_ID", "player1Hand", 0, 0])
    game = Evaluate.evaluate(game, ["MOVE_CARD", dwarf_card_id, "player1Play1", 1, 0])
    assert length(game["groupById"]["player1Play1"]["stackIds"]) == 2
    assert game["cardById"][dwarf_card_id]["tokens"]["willpower"] == 1
    assert game["cardById"][dwarf_card_id]["tokens"]["attack"] == 1

    # Load Itilien Lookout
    game = Evaluate.evaluate(game, ["LOAD_CARDS", ["LIST", %{"databaseId" => "86edf661-e3d8-4372-9325-f2d2d5ac354a", "loadGroupId" => "player1Hand", "quantity" => 1}]])
    assert length(game["groupById"]["player1Hand"]["stackIds"]) == 1

    # Move Itilien Lookout
    lookout_card_id = Evaluate.evaluate(game, ["GET_CARD_ID", "player1Hand", 0, 0])
    game = Evaluate.evaluate(game, ["MOVE_CARD", lookout_card_id, "player1Play1", 1, 0])
    assert length(game["groupById"]["player1Play1"]["stackIds"]) == 3
    assert game["cardById"][lookout_card_id]["tokens"]["willpower"] == nil
    assert game["cardById"][lookout_card_id]["tokens"]["attack"] == nil
    assert game["cardById"][lookout_card_id]["tokens"]["defense"] == nil

    # Exhaust Dain
    assert game["cardById"][dain_card_id]["exhausted"] == false
    game = Evaluate.evaluate(game, [["DEFINE", "$ACTIVE_CARD_ID", dain_card_id], ["ACTION_LIST", "toggleExhaust"]])
    assert game["cardById"][dain_card_id]["exhausted"] == true
    assert game["cardById"][dwarf_card_id]["tokens"]["willpower"] == 0
    assert game["cardById"][dwarf_card_id]["tokens"]["attack"] == 0

    # Ready Dain
    assert game["cardById"][dain_card_id]["exhausted"] == true
    game = Evaluate.evaluate(game, [["DEFINE", "$ACTIVE_CARD_ID", dain_card_id], ["ACTION_LIST", "toggleExhaust"]])
    assert game["cardById"][dain_card_id]["exhausted"] == false
    assert game["cardById"][dwarf_card_id]["tokens"]["willpower"] == 1
    assert game["cardById"][dwarf_card_id]["tokens"]["attack"] == 1

    # Flip Dain
    assert game["cardById"][dain_card_id]["currentSide"] == "A"
    game = Evaluate.evaluate(game, [["DEFINE", "$ACTIVE_CARD_ID", dain_card_id], ["ACTION_LIST", "flipCard"]])
    assert game["cardById"][dain_card_id]["currentSide"] == "B"
    assert game["cardById"][dwarf_card_id]["tokens"]["willpower"] == 0
    assert game["cardById"][dwarf_card_id]["tokens"]["attack"] == 0

    # Flip Dain
    assert game["cardById"][dain_card_id]["currentSide"] == "B"
    game = Evaluate.evaluate(game, [["DEFINE", "$ACTIVE_CARD_ID", dain_card_id], ["ACTION_LIST", "flipCard"]])
    assert game["cardById"][dain_card_id]["currentSide"] == "A"
    assert game["cardById"][dwarf_card_id]["tokens"]["willpower"] == 1
    assert game["cardById"][dwarf_card_id]["tokens"]["attack"] == 1

    # Discard Dain
    game = Evaluate.evaluate(game, [["DEFINE", "$ACTIVE_CARD_ID", dain_card_id], ["ACTION_LIST", "discardCard"]])
    assert game["cardById"][dwarf_card_id]["tokens"]["willpower"] == 0
    assert game["cardById"][dwarf_card_id]["tokens"]["attack"] == 0




    # Print all messages
    Enum.each(game["messages"], fn message ->
      IO.puts(message)
    end)

  end


  # Outlands
  @tag :outlands
  test "Outlands", %{user: _user, game: game, game_def: _game_def} do

    # Load Ethir 1
    game = Evaluate.evaluate(game, ["LOAD_CARDS", ["LIST", %{"databaseId" => "1c149f93-9e3b-42fa-878c-80b29563a283", "loadGroupId" => "player1Hand", "quantity" => 1}]])
    assert length(game["groupById"]["player1Hand"]["stackIds"]) == 1

    # Move ally to the table
    ethir_1_card_id = Evaluate.evaluate(game, ["GET_CARD_ID", "player1Hand", 0, 0])
    game = Evaluate.evaluate(game, ["MOVE_CARD", ethir_1_card_id, "player1Play1", 0, 0])
    assert length(game["groupById"]["player1Play1"]["stackIds"]) == 1
    assert game["cardById"][ethir_1_card_id]["tokens"]["willpower"] == 1

    # Load Ethir 2
    game = Evaluate.evaluate(game, ["LOAD_CARDS", ["LIST", %{"databaseId" => "1c149f93-9e3b-42fa-878c-80b29563a283", "loadGroupId" => "player1Hand", "quantity" => 1}]])
    assert length(game["groupById"]["player1Hand"]["stackIds"]) == 1

    # Move ally to the table
    ethir_2_card_id = Evaluate.evaluate(game, ["GET_CARD_ID", "player1Hand", 0, 0])
    game = Evaluate.evaluate(game, ["MOVE_CARD", ethir_2_card_id, "player1Play1", 0, 0])
    assert length(game["groupById"]["player1Play1"]["stackIds"]) == 2
    assert game["cardById"][ethir_1_card_id]["tokens"]["willpower"] == 2
    assert game["cardById"][ethir_2_card_id]["tokens"]["willpower"] == 2

    # Load Lossarnach 1
    game = Evaluate.evaluate(game, ["LOAD_CARDS", ["LIST", %{"databaseId" => "2e84d805-365c-47ea-9c4f-e3f75daeb9a6", "loadGroupId" => "player1Hand", "quantity" => 1}]])
    assert length(game["groupById"]["player1Hand"]["stackIds"]) == 1

    # Move ally to the table
    lossarnach_1_card_id = Evaluate.evaluate(game, ["GET_CARD_ID", "player1Hand", 0, 0])
    game = Evaluate.evaluate(game, ["MOVE_CARD", lossarnach_1_card_id, "player1Play1", 0, 0])
    assert length(game["groupById"]["player1Play1"]["stackIds"]) == 3
    assert game["cardById"][ethir_1_card_id]["tokens"]["willpower"] == 2
    assert game["cardById"][ethir_2_card_id]["tokens"]["willpower"] == 2
    assert game["cardById"][lossarnach_1_card_id]["tokens"]["willpower"] == 2
    assert game["cardById"][ethir_1_card_id]["tokens"]["defense"] == 1
    assert game["cardById"][ethir_2_card_id]["tokens"]["defense"] == 1
    assert game["cardById"][lossarnach_1_card_id]["tokens"]["defense"] == 1

    # Load Knight 1
    game = Evaluate.evaluate(game, ["LOAD_CARDS", ["LIST", %{"databaseId" => "c00844d6-1c3c-4e8c-a46c-8de15b8408df", "loadGroupId" => "player1Hand", "quantity" => 1}]])
    assert length(game["groupById"]["player1Hand"]["stackIds"]) == 1

    # Move ally to the table
    knight_1_card_id = Evaluate.evaluate(game, ["GET_CARD_ID", "player1Hand", 0, 0])
    game = Evaluate.evaluate(game, ["MOVE_CARD", knight_1_card_id, "player1Play1", 0, 0])
    assert length(game["groupById"]["player1Play1"]["stackIds"]) == 4
    assert game["cardById"][ethir_1_card_id]["tokens"]["willpower"] == 2
    assert game["cardById"][ethir_2_card_id]["tokens"]["willpower"] == 2
    assert game["cardById"][lossarnach_1_card_id]["tokens"]["willpower"] == 2
    assert game["cardById"][knight_1_card_id]["tokens"]["willpower"] == 2
    assert game["cardById"][ethir_1_card_id]["tokens"]["defense"] == 1
    assert game["cardById"][ethir_2_card_id]["tokens"]["defense"] == 1
    assert game["cardById"][lossarnach_1_card_id]["tokens"]["defense"] == 1
    assert game["cardById"][knight_1_card_id]["tokens"]["defense"] == 1
    assert game["cardById"][ethir_1_card_id]["tokens"]["attack"] == 1
    assert game["cardById"][ethir_2_card_id]["tokens"]["attack"] == 1
    assert game["cardById"][lossarnach_1_card_id]["tokens"]["attack"] == 1
    assert game["cardById"][knight_1_card_id]["tokens"]["attack"] == 1

    # Load Anfalas 1
    game = Evaluate.evaluate(game, ["LOAD_CARDS", ["LIST", %{"databaseId" => "4cb4741d-c9d8-4d62-ab4f-50fa80c59fbb", "loadGroupId" => "player1Hand", "quantity" => 1}]])
    assert length(game["groupById"]["player1Hand"]["stackIds"]) == 1

    # Move ally to the table
    anfalas_1_card_id = Evaluate.evaluate(game, ["GET_CARD_ID", "player1Hand", 0, 0])
    game = Evaluate.evaluate(game, ["MOVE_CARD", anfalas_1_card_id, "player1Play1", 0, 0])
    assert length(game["groupById"]["player1Play1"]["stackIds"]) == 5
    assert game["cardById"][ethir_1_card_id]["tokens"]["hitPoints"] == 1
    assert game["cardById"][ethir_2_card_id]["tokens"]["hitPoints"] == 1
    assert game["cardById"][lossarnach_1_card_id]["tokens"]["hitPoints"] == 1
    assert game["cardById"][knight_1_card_id]["tokens"]["hitPoints"] == 1
    assert game["cardById"][anfalas_1_card_id]["tokens"]["hitPoints"] == 1

    # Flip Ethir 2 facedown
    assert game["cardById"][ethir_2_card_id]["currentSide"] == "A"
    game = Evaluate.evaluate(game, [["DEFINE", "$ACTIVE_CARD_ID", ethir_2_card_id], ["ACTION_LIST", "flipCard"]])
    assert game["cardById"][ethir_2_card_id]["currentSide"] == "B"
    assert game["cardById"][ethir_1_card_id]["tokens"]["willpower"] == 1
    assert game["cardById"][ethir_2_card_id]["tokens"]["willpower"] == 1
    assert game["cardById"][lossarnach_1_card_id]["tokens"]["willpower"] == 1

    # Flip Ethir 2 facedown
    game = Evaluate.evaluate(game, [["DEFINE", "$ACTIVE_CARD_ID", ethir_2_card_id], ["ACTION_LIST", "flipCard"]])
    assert game["cardById"][ethir_2_card_id]["currentSide"] == "A"
    assert game["cardById"][ethir_1_card_id]["tokens"]["willpower"] == 2
    assert game["cardById"][ethir_2_card_id]["tokens"]["willpower"] == 2
    assert game["cardById"][lossarnach_1_card_id]["tokens"]["willpower"] == 2


    # Print all messages
    Enum.each(game["messages"], fn message ->
      IO.puts(message)
    end)

  end

  # Border color
  @tag :border_color
  test "Border Color", %{user: _user, game: game, game_def: _game_def} do

    # Load Dain
    game = Evaluate.evaluate(game, ["LOAD_CARDS", ["LIST", %{"databaseId" => "51223bd0-ffd1-11df-a976-0801206c9005", "loadGroupId" => "player1Play1", "quantity" => 1}]])
    assert length(game["groupById"]["player1Play1"]["stackIds"]) == 1
    dain_card_id = Evaluate.evaluate(game, ["GET_CARD_ID", "player1Play1", 0, 0])

    # Damage Dain
    game = Evaluate.evaluate(game, ["INCREASE_VAL", "/cardById/#{dain_card_id}/tokens/damage", 1])
    game = Evaluate.evaluate(game, ["INCREASE_VAL", "/cardById/#{dain_card_id}/tokens/damage", 1])
    game = Evaluate.evaluate(game, ["INCREASE_VAL", "/cardById/#{dain_card_id}/tokens/damage", 1])
    game = Evaluate.evaluate(game, ["INCREASE_VAL", "/cardById/#{dain_card_id}/tokens/damage", 1])
    game = Evaluate.evaluate(game, ["INCREASE_VAL", "/cardById/#{dain_card_id}/tokens/damage", 1])
    assert game["cardById"][dain_card_id]["borderColor"] == "red"

    # Give Dain some hit points
    game = Evaluate.evaluate(game, ["INCREASE_VAL", "/cardById/#{dain_card_id}/tokens/hitPoints", 1])
    game = Evaluate.evaluate(game, ["INCREASE_VAL", "/cardById/#{dain_card_id}/tokens/hitPoints", 1])
    assert game["cardById"][dain_card_id]["borderColor"] == nil

    # Dmage him again
    game = Evaluate.evaluate(game, ["INCREASE_VAL", "/cardById/#{dain_card_id}/tokens/damage", 1])
    assert game["cardById"][dain_card_id]["borderColor"] == nil
    game = Evaluate.evaluate(game, ["INCREASE_VAL", "/cardById/#{dain_card_id}/tokens/damage", 1])
    assert game["cardById"][dain_card_id]["borderColor"] == "red"

    # Print all messages
    Enum.each(game["messages"], fn message ->
      IO.puts(message)
    end)

  end

  @tag :for_each
  test "for_each", %{user: _user, game: game, game_def: _game_def} do

    game = Evaluate.evaluate(game, ["VAR", "$MYVAR", %{"test" => "test"}])

    game = Evaluate.evaluate(game, ["LOAD_CARDS", "coreLeadership"]) # Leadership core set deck

  end

  # Staging threat
  @tag :staging_threat
  test "staging_threat", %{user: _user, game: game, game_def: _game_def} do

    # Load some decks into the game
    game = Evaluate.evaluate(game, ["LOAD_CARDS", "Q01.1"]) # Passage through Mirkwood
    game = Evaluate.evaluate(game, ["LOAD_CARDS", "coreLeadership"]) # Leadership core set deck


    assert length(game["groupById"]["player1Hand"]["stackIds"]) == 6
    assert length(game["groupById"]["player1Deck"]["stackIds"]) == 24
    assert game["stagingThreat"] == 3
    assert game["questProgress"] == -3

    aragorn_card_id = Evaluate.evaluate(game, ["GET_CARD_ID", "player1Play1", 0, 0])
    game = Evaluate.evaluate(game, ["INCREASE_VAL", "/cardById/#{aragorn_card_id}/tokens/willpower", 1])

    # Commit Aragorn
    game = Evaluate.evaluate(game, [
      ["DEFINE", "$ACTIVE_CARD_ID", aragorn_card_id],
      ["ACTION_LIST", "toggleCommit"]
    ])

    assert game["stagingThreat"] == 3
    assert game["questProgress"] == 0

    game = Evaluate.evaluate(game, ["INCREASE_VAL", "/cardById/#{aragorn_card_id}/tokens/willpower", 1])

    assert game["stagingThreat"] == 3
    assert game["questProgress"] == 1

    staging_card_id = Evaluate.evaluate(game, ["GET_CARD_ID", "sharedStagingArea", 0, 0])
    game = Evaluate.evaluate(game, ["INCREASE_VAL", "/cardById/#{staging_card_id}/tokens/threat", 1])

    assert game["stagingThreat"] == 4
    assert game["questProgress"] == 0

    # Discard
    game = Evaluate.evaluate(game, [
      ["DEFINE", "$ACTIVE_CARD_ID", aragorn_card_id],
      ["ACTION_LIST", "discardCard"]
    ])

    assert game["stagingThreat"] == 4
    assert game["questProgress"] == -4


    # Print all messages
    Enum.each(game["messages"], fn message ->
      IO.puts(message)
    end)
  end



  # Questing
  @tag :questing
  test "questing", %{user: _user, game: game, game_def: _game_def} do

    # Load some decks into the game
    game = Evaluate.evaluate(game, ["LOAD_CARDS", "coreLeadership"]) # Leadership core set deck
    assert length(game["groupById"]["player1Hand"]["stackIds"]) == 6
    assert length(game["groupById"]["player1Deck"]["stackIds"]) == 24

    card_id = Evaluate.evaluate(game, ["GET_CARD_ID", "player1Play1", 0, 0])
    game = Evaluate.evaluate(game, ["INCREASE_VAL", "/cardById/#{card_id}/tokens/willpower", 1])

    # Commit
    game = Evaluate.evaluate(game, [
      ["DEFINE", "$ACTIVE_CARD_ID", card_id],
      ["ACTION_LIST", "toggleCommit"]
    ])

    assert Evaluate.evaluate(game, "$GAME.cardById.#{card_id}.committed") == true
    assert Evaluate.evaluate(game, "$GAME.cardById.#{card_id}.exhausted") == true
    assert Evaluate.evaluate(game, "$GAME.playerData.player1.willpower") == 3

    # Uncommit
    game = Evaluate.evaluate(game, [
      ["DEFINE", "$ACTIVE_CARD_ID", card_id],
      ["ACTION_LIST", "toggleCommit"]
    ])

    assert Evaluate.evaluate(game, "$GAME.cardById.#{card_id}.committed") == false
    assert Evaluate.evaluate(game, "$GAME.cardById.#{card_id}.exhausted") == false

    # Commit without exhausting
    game = Evaluate.evaluate(game, [
      ["DEFINE", "$ACTIVE_CARD_ID", card_id],
      ["ACTION_LIST", "toggleCommitWithoutExhausting"]
    ])

    assert Evaluate.evaluate(game, "$GAME.cardById.#{card_id}.committed") == true
    assert Evaluate.evaluate(game, "$GAME.cardById.#{card_id}.exhausted") == false

    # Uncommit without exhausting
    game = Evaluate.evaluate(game, [
      ["DEFINE", "$ACTIVE_CARD_ID", card_id],
      ["ACTION_LIST", "toggleCommitWithoutExhausting"]
    ])

    assert Evaluate.evaluate(game, "$GAME.cardById.#{card_id}.committed") == false
    assert Evaluate.evaluate(game, "$GAME.cardById.#{card_id}.exhausted") == false

    # Commit
    game = Evaluate.evaluate(game, [
      ["DEFINE", "$ACTIVE_CARD_ID", card_id],
      ["ACTION_LIST", "toggleCommit"]
    ])

    assert Evaluate.evaluate(game, "$GAME.playerData.player1.willpower") == 3

    # Discard
    game = Evaluate.evaluate(game, [
      ["DEFINE", "$ACTIVE_CARD_ID", card_id],
      ["ACTION_LIST", "discardCard"]
    ])

    assert Evaluate.evaluate(game, "$GAME.playerData.player1.willpower") == 0

    # Print all messages
    Enum.each(game["messages"], fn message ->
      IO.puts(message)
    end)

  end



  # Shuffle discard into deck
  @tag :shuffle_discard_into_deck
  test "shuffle_discard_into_deck", %{user: _user, game: game, game_def: _game_def} do
    # Load some decks into the game
    game = Evaluate.evaluate(game, ["LOAD_CARDS", "Q01.1"]) # Passage through Mirkwood
    game = Evaluate.evaluate(game, ["LOAD_CARDS", "coreLeadership"]) # Leadership core set deck
    game = Evaluate.evaluate(game, ["RESET_INDEX"])

    assert length(game["groupById"]["player1Hand"]["stackIds"]) == 6
    assert length(game["groupById"]["player1Deck"]["stackIds"]) == 24
    assert length(game["groupById"]["sharedEncounterDeck"]["stackIds"]) == 34

    # Discard
    card_id = Evaluate.evaluate(game, ["GET_CARD_ID", "sharedEncounterDeck", 0, 0])
    game = Evaluate.evaluate(game, [
      ["DEFINE", "$ACTIVE_CARD_ID", card_id],
      ["ACTION_LIST", "discardCard"]
    ])

    card_id = Evaluate.evaluate(game, ["GET_CARD_ID", "sharedEncounterDeck", 0, 0])
    game = Evaluate.evaluate(game, [
      ["DEFINE", "$ACTIVE_CARD_ID", card_id],
      ["ACTION_LIST", "discardCard"]
    ])
    card_id = Evaluate.evaluate(game, ["GET_CARD_ID", "sharedEncounterDeck", 0, 0])
    game = Evaluate.evaluate(game, [
      ["DEFINE", "$ACTIVE_CARD_ID", card_id],
      ["ACTION_LIST", "discardCard"]
    ])
    assert length(game["groupById"]["sharedEncounterDeck"]["stackIds"]) == 31

    # Shuffle back
    card_id = Evaluate.evaluate(game, ["GET_CARD_ID", "sharedEncounterDiscard", 0, 0])
    game = Evaluate.evaluate(game, [
      ["DEFINE", "$ACTIVE_CARD_ID", card_id],
      ["ACTION_LIST", "shuffleGroupIntoDeck"]
    ])
    assert length(game["groupById"]["sharedEncounterDeck"]["stackIds"]) == 34

    # Repeat for player deck
    card_id = Evaluate.evaluate(game, ["GET_CARD_ID", "player1Deck", 0, 0])
    IO.puts(card_id)
    game = Evaluate.evaluate(game, [
      ["DEFINE", "$ACTIVE_CARD_ID", card_id],
      ["ACTION_LIST", "discardCard"]
    ])
    card_id = Evaluate.evaluate(game, ["GET_CARD_ID", "player1Deck", 0, 0])
    game = Evaluate.evaluate(game, [
      ["DEFINE", "$ACTIVE_CARD_ID", card_id],
      ["ACTION_LIST", "discardCard"]
    ])
    card_id = Evaluate.evaluate(game, ["GET_CARD_ID", "player1Deck", 0, 0])
    game = Evaluate.evaluate(game, [
      ["DEFINE", "$ACTIVE_CARD_ID", card_id],
      ["ACTION_LIST", "discardCard"]
    ])
    assert length(game["groupById"]["player1Deck"]["stackIds"]) == 21

    # Shuffle back
    card_id = Evaluate.evaluate(game, ["GET_CARD_ID", "player1Discard", 0, 0])
    game = Evaluate.evaluate(game, [
      ["DEFINE", "$ACTIVE_CARD_ID", card_id],
      ["ACTION_LIST", "shuffleGroupIntoDeck"]
    ])
    assert length(game["groupById"]["player1Deck"]["stackIds"]) == 24

    # Print all messages
    Enum.each(game["messages"], fn message ->
      IO.puts(message)
    end)

  end

  # Swap with top card of deck
  @tag :swap_with_top
  test "swap_with_top", %{user: _user, game: game, game_def: _game_def} do

    # Load some decks into the game
    game = Evaluate.evaluate(game, ["LOAD_CARDS", "coreLeadership"]) # Leadership core set deck
    assert length(game["groupById"]["player1Hand"]["stackIds"]) == 6
    assert length(game["groupById"]["player1Deck"]["stackIds"]) == 24

    card_id_hand = Evaluate.evaluate(game, ["GET_CARD_ID", "player1Hand", 3, 0])
    card_id_deck = Evaluate.evaluate(game, ["GET_CARD_ID", "player1Deck", 0, 0])

    # Swap
    game = Evaluate.evaluate(game, [
      ["DEFINE", "$ACTIVE_CARD_ID", card_id_hand],
      ["ACTION_LIST", "swapWithTop"]
    ])

    assert Evaluate.evaluate(game, "$GAME.cardById.#{card_id_hand}.groupId") == "player1Deck"
    assert Evaluate.evaluate(game, "$GAME.cardById.#{card_id_deck}.groupId") == "player1Hand"

    #assert Evaluate.evaluate(game, "$GAME.cardById.#{card_id_hand}.stackIndex") == 0 -- No longer works because we only refresh the stack index when sending to frontend
    #assert Evaluate.evaluate(game, "$GAME.cardById.#{card_id_deck}.stackIndex") == 3

    assert length(game["groupById"]["player1Hand"]["stackIds"]) == 6
    assert length(game["groupById"]["player1Deck"]["stackIds"]) == 24

    # Print all messages
    Enum.each(game["messages"], fn message ->
      IO.puts(message)
    end)

  end


  # While loop
  @tag :while_loop
  test "while_loop", %{user: _user, game: game, game_def: _game_def} do

    # Load some decks into the game
    game = Evaluate.evaluate(game, ["LOAD_CARDS", "Q01.1"]) # Passage through Mirkwood
    game = Evaluate.evaluate(game, ["LOAD_CARDS", "coreLeadership"]) # Leadership core set deck
    assert length(game["groupById"]["player1Hand"]["stackIds"]) == 6
    assert length(game["groupById"]["player1Deck"]["stackIds"]) == 24

    game = Evaluate.evaluate(game, [
      ["WHILE",
        ["NOT_EQUAL", "$GAME.groupById.sharedEncounterDeck.parentCards.[0].sides.A.type", "Enemy"],
        [
          ["DEFINE", "$ACTIVE_CARD_ID", "$GAME.groupById.sharedEncounterDeck.parentCardIds.[0]"],
          ["ACTION_LIST", "discardCard"]
        ]
      ]
    ])

    assert Evaluate.evaluate(game, "$GAME.groupById.sharedEncounterDeck.parentCards.[0].sides.A.type") == "Enemy"

    # Print all messages
    Enum.each(game["messages"], fn message ->
      IO.puts(message)
    end)
  end

  # Functions
  @tag :functions
  test "functions", %{user: _user, game: game, game_def: _game_def} do

    game = Evaluate.evaluate(game, ["FUNCTION", "MY_ADD", "$A", "$B", ["ADD", "$A", "$B"]])
    assert Evaluate.evaluate(game, ["MY_ADD", 1, 2]) == 3

    game = Evaluate.evaluate(game, ["FUNCTION", "MY_DECREASE", "$A", %{"$B" => 1}, ["SUBTRACT", "$A", "$B"]])
    assert Evaluate.evaluate(game, ["MY_DECREASE", 2, 2]) == 0
    assert Evaluate.evaluate(game, ["MY_DECREASE", 2, 1]) == 1


    game = Evaluate.evaluate(game, ["LOAD_CARDS", "coreLeadership"]) # Leadership core set deck
    game = Evaluate.evaluate(game, ["FUNCTION", "MOVE_TOP_N_CARDS_OF_GROUP_TO_BOTTOM", "$N", "$GROUP_ID", ["MOVE_STACKS", "$GROUP_ID", "$GROUP_ID", "$N", "bottom"]])
    top_3 = Evaluate.evaluate(game, "$GAME.groupById.player1Deck.parentCardIds") |> Enum.slice(0, 3)
    game = Evaluate.evaluate(game, ["MOVE_TOP_N_CARDS_OF_GROUP_TO_BOTTOM", 3, "player1Deck"])
    bottom_3 = Evaluate.evaluate(game, "$GAME.groupById.player1Deck.parentCardIds") |> Enum.slice(-3, 3)
    assert top_3 == bottom_3


    game = Evaluate.evaluate(game, ["LOAD_CARDS", "Q01.1"]) # Passage through Mirkwood
    game = Evaluate.evaluate(game, ["DISCARD_UNTIL", "sharedEncounterDeck", "Enemy"])


    # Print all messages
    Enum.each(game["messages"], fn message ->
      IO.puts(message)
    end)

  end

  # Pointers
  @tag :pointers
  test "pointers", %{user: _user, game: game, game_def: _game_def} do

    game = Evaluate.evaluate(game, ["DEFINE", "$LAZY_ADD", ["POINTER", ["ADD", "$A", "$B"]]])
    game = Evaluate.evaluate(game, ["DEFINE", "$A", 1])
    game = Evaluate.evaluate(game, ["DEFINE", "$B", 2])
    assert Evaluate.evaluate(game, ["ACTION_LIST", "$LAZY_ADD"]) == 3

    game = Evaluate.evaluate(game, ["DEFINE", "$A", 2])
    assert Evaluate.evaluate(game, ["ACTION_LIST", "$LAZY_ADD"]) == 4


    game = Evaluate.evaluate(game, ["LOAD_CARDS", "Q01.1"]) # Passage through Mirkwood
    game = Evaluate.evaluate(game, ["FUNCTION", "DISCARD_UNTIL", "$GROUP_ID", "$COND", [
        ["VAR", "$CARD_ID", "$GAME.groupById.$GROUP_ID.parentCardIds.[0]"],
        ["VAR", "$CARD", "$GAME.cardById.$CARD_ID"],
        ["WHILE",
          ["AND",
            ["NOT", ["ACTION_LIST", "$COND"]],
            ["GREATER_THAN", ["LENGTH", "$GAME.groupById.$GROUP_ID.stackIds"], 1]
          ],
          [
            ["MOVE_CARD", "$CARD_ID", "$CARD.discardGroupId", 0],
            ["UPDATE_VAR", "$CARD_ID", "$GAME.groupById.$GROUP_ID.parentCardIds.[0]"],
            ["UPDATE_VAR", "$CARD", "$GAME.cardById.$CARD_ID"]
          ]
        ]
      ]
    ])
    game = Evaluate.evaluate(game, [
      ["VAR", "$COND",
        ["POINTER",
          ["EQUAL", "$CARD.sides.A.type", "Enemy"]
        ]
      ],
      ["DISCARD_UNTIL", "sharedEncounterDeck", "$COND"]
    ])
    card_type = Evaluate.evaluate(game, "$GAME.groupById.sharedEncounterDeck.parentCards.[0].sides.A.type")
    assert card_type == "Enemy"

    game = Evaluate.evaluate(game, [
      ["VAR", "$COND",
        ["POINTER",
          ["EQUAL", "$CARD.sides.A.type", "Location"]
        ]
      ],
      ["DISCARD_UNTIL", "sharedEncounterDeck", "$COND"]
    ])
    card_type = Evaluate.evaluate(game, "$GAME.groupById.sharedEncounterDeck.parentCards.[0].sides.A.type")
    assert card_type == "Location"

  end

  # Local variables
  @tag :local_var
  test "local_var", %{user: _user, game: game, game_def: _game_def} do

    game = Evaluate.evaluate(game, [
      ["VAR", "$A", 0],
      ["FOR_EACH_START_STOP_STEP", "$I", 0, 8, 1, [
        ["LOG_DEV", "$I"],
        ["INCREASE_VAR", "$A", 1]
      ]],
      ["LOG_DEV", "$A"]
    ])


  end

  @tag :mount_gram
  test "mount_gram", %{user: _user, game: game, game_def: game_def} do

    # Load some decks into the game
    game = Evaluate.evaluate(game, ["LOAD_CARDS", "Q05.5"])
    game = Evaluate.evaluate(game, ["LOAD_CARDS", "coreLeadership"]) # Leadership core set deck

    # Flip 2 of the heroes over

    game = Evaluate.evaluate(game, [["DEFINE", "$ACTIVE_CARD_ID", ["GET_CARD_ID", "player1Play1", 0, 0]], ["ACTION_LIST", "flipCard"]])
    game = Evaluate.evaluate(game, [["DEFINE", "$ACTIVE_CARD_ID", ["GET_CARD_ID", "player1Play1", 1, 0]], ["ACTION_LIST", "flipCard"]])

    prompt_keys = Map.keys(game["playerData"]["player1"]["prompts"])
    prompt_key = Enum.at(prompt_keys, 0)
    prompt = game["playerData"]["player1"]["prompts"][prompt_key]
    option = Enum.at(prompt["options"], 0)
    code = option["code"]
    game = Evaluate.evaluate(game, code)

  end

  @tag :totd
  test "totd", %{user: _user, game: game, game_def: game_def} do

    # Load some decks into the game
    game = Evaluate.evaluate(game, ["LOAD_CARDS", "Q06.6"])
    game = Evaluate.evaluate(game, ["LOAD_CARDS", "coreLeadership"]) # Leadership core set deck

    prompt_keys = Map.keys(game["playerData"]["player1"]["prompts"])
    prompt_key = Enum.at(prompt_keys, 0)
    prompt = game["playerData"]["player1"]["prompts"][prompt_key]
    option = Enum.at(prompt["options"], 0)
    code = option["code"]
    game = Evaluate.evaluate(game, code)

    assert Enum.count(game["groupById"]["sharedExtra1"]["stackIds"]) == 5
    assert Enum.count(game["groupById"]["sharedExtra2"]["stackIds"]) == 5
    assert Enum.count(game["groupById"]["sharedExtra3"]["stackIds"]) == 5
    assert Evaluate.evaluate(game, "$GAME.groupById.sharedExtra1.parentCards.[0].currentSide") == "A"
    assert Evaluate.evaluate(game, "$GAME.groupById.sharedExtra1.parentCards.[1].currentSide") == "B"

  end

  @tag :look_at_top_x
  test "look_at_top_x", %{user: _user, game: game, game_def: game_def} do

    # Load some decks into the game
    game = Evaluate.evaluate(game, ["LOAD_CARDS", "Q06.6"])
    game = Evaluate.evaluate(game, ["LOAD_CARDS", "coreLeadership"]) # Leadership core set deck

    # Load Stargazer
    game = Evaluate.evaluate(game, ["LOAD_CARDS", ["LIST", %{"databaseId" => "51223bd0-ffd1-11df-a976-0801212c9019", "loadGroupId" => "player1Play2", "quantity" => 1}]])

    # Get the card
    card = Evaluate.evaluate(game, ["GET_CARD", "player1Play2", 0, 0])

    #
    IO.puts("card")
    IO.inspect(card)

    # Trigger the ability
    game = Evaluate.evaluate(game, ["ABILITY", card["id"], "A"])

    # Print all messages
    Enum.each(game["messages"], fn message ->
      IO.puts(message)
    end)

  end


  @tag :dynamic_prompt
  test "dynamic_prompt", %{user: _user, game: game, game_def: _game_def} do

    game = Evaluate.evaluate(game, ["FUNCTION", "LOCATION_NAME_TO_PROMPT_OPTION", "$LOCATION_NAME", ["PROCESS_MAP",
        %{
          "label" => "$LOCATION_NAME",
          "hotkey" => [
            ["VAR", "$HOTKEY_NUM", ["CALC", "{{$MAP_INDEX}} + 1"]],
            "{{$HOTKEY_NUM}}"
          ],
          "actionList" => ["LIST", "CHOSE_LOCATION", "$LOCATION_NAME"]
        }
      ]])

    game = Evaluate.evaluate(game, ["FUNCTION", "LOCATION_NAMES_TO_PROMPT_OPTIONS", "$LOCATION_NAMES", ["MAP", "$LOCATION_NAMES", "LOCATION_NAME_TO_PROMPT_OPTION"]])

    res = Evaluate.evaluate(game, ["LOCATION_NAMES_TO_PROMPT_OPTIONS", ["LIST", "testLocation1", "testLocation2"]])



    IO.inspect(res)

    # ]])
  end


  @tag :sort_obj_list
  test "sort_obj_list", %{user: _user, game: game, game_def: game_def} do

    # Load some decks into the game
    game = Evaluate.evaluate(game, ["LOAD_CARDS", "Q06.6"])
    game = Evaluate.evaluate(game, ["LOAD_CARDS", "coreLeadership"]) # Leadership core set deck

    # Load Stargazer
    res = Evaluate.evaluate(game, ["SORT_OBJ_LIST", "$GAME.groupById.player1Deck.parentCards", "$CARD", "$CARD.sides.A.name"])

    assert Enum.at(res, 0)["sides"]["A"]["name"] == "Brok Ironfist"

  end


  @tag :to_int
  test "to_int", %{user: _user, game: game, game_def: game_def} do

    # Load some decks into the game
    a = Evaluate.evaluate(game, ["TO_INT", "6.6"])
    assert a == 6

    b = Evaluate.evaluate(game, ["TO_INT", "6"])
    assert b == 6

    c = Evaluate.evaluate(game, ["TO_INT", 6.6])
    assert c == 6

    d = Evaluate.evaluate(game, ["TO_INT", 6])
    assert d == 6

    e = Evaluate.evaluate(game, ["TO_INT", "6.0"])
    assert e == 6

    f = Evaluate.evaluate(game, ["TO_INT", nil])
    assert f == nil

  end


  @tag :remove_first
  test "remove_first", %{user: _user, game: game, game_def: game_def} do

    res = Evaluate.evaluate(game, ["REMOVE_FIRST_FROM_LIST_BY_VALUE", ["LIST", 1, 2, 3], 1])
    assert res == [2, 3]

    res = Evaluate.evaluate(game, ["REMOVE_FIRST_FROM_LIST_BY_VALUE", ["LIST", 1], 1])
    assert res == []

    res = Evaluate.evaluate(game, ["REMOVE_FIRST_FROM_LIST_BY_VALUE", ["LIST"], 1])
    assert res == []

    res = Evaluate.evaluate(game, ["REMOVE_FIRST_FROM_LIST_BY_VALUE", ["LIST", 1, 2, 3], 2])
    assert res == [1, 3]

    res = Evaluate.evaluate(game, ["REMOVE_FIRST_FROM_LIST_BY_VALUE", ["LIST", 1, 2, 3], 3])
    assert res == [1, 2]

    res = Evaluate.evaluate(game, ["REMOVE_FIRST_FROM_LIST_BY_VALUE", ["LIST", 1, 2, 3], 4])
    assert res == [1, 2, 3]

    res = Evaluate.evaluate(game, ["REMOVE_FIRST_FROM_LIST_BY_VALUE", ["LIST", 1, 2, 3], nil])
    assert res == [1, 2, 3]

    res = Evaluate.evaluate(game, ["REMOVE_FIRST_FROM_LIST_BY_VALUE", ["LIST", 1, 2, 3], "1"])
    assert res == [1, 2, 3]

    res = Evaluate.evaluate(game, ["REMOVE_FIRST_FROM_LIST_BY_VALUE", ["LIST", 1, 2, 3], 1.0])
    assert res == [1, 2, 3]

    res = Evaluate.evaluate(game, ["REMOVE_FIRST_FROM_LIST_BY_VALUE", ["LIST", 1, 2, 3, 2, 3], 2])
    assert res == [1, 3, 2, 3]

  end


  @tag :regex_replace
  test "regex_replace", %{user: _user, game: game, game_def: game_def} do

    res = Evaluate.evaluate(game, ["REGEX_REPLACE", "Hello World", "World", "There"])
    assert res == "Hello There"

    res = Evaluate.evaluate(game, ["REGEX_REPLACE", "Hello World", ".", "1"])
    assert res == "11111111111"

    res = Evaluate.evaluate(game, ["REGEX_REPLACE", "Hello World", " \\w+", "1"])
    assert res == "Hello1"




  end
  # @tag :glittering
  # test "glittering", %{user: _user, game: game, game_def: game_def} do

  #   # Load some decks into the game
  #   game = Evaluate.evaluate(game, ["LOAD_CARDS", "QA1.7"])
  #   # game = Evaluate.evaluate(game, ["LOAD_CARDS", "coreLeadership"]) # Leadership core set deck

  #   prompt_keys = Map.keys(game["playerData"]["player1"]["prompts"])
  #   prompt_key = Enum.at(prompt_keys, 0)
  #   prompt = game["playerData"]["player1"]["prompts"][prompt_key]
  #   option = Enum.at(prompt["options"], 0)
  #   code = option["code"]
  #   game = Evaluate.evaluate(game, code)

  #   # assert Enum.count(game["groupById"]["sharedExtra1"]["stackIds"]) == 4
  #   # assert Enum.count(game["groupById"]["sharedExtra2"]["stackIds"]) == 4
  #   # assert Enum.count(game["groupById"]["sharedExtra3"]["stackIds"]) == 4


  # end

  # Local variables
  @tag :temp
  test "temp", %{user: _user, game: game, game_def: _game_def} do

    str = "Hello {0}, your order {1} is ready for pickup at {2}."
    values = ["John", "#1234", "5:00 PM"]

    res = StringReplacer.replace_placeholders(str, values)

    IO.puts(res)


  end

  # # temp
  # @tag :temp
  # test "temp", %{user: _user, game: game, game_def: _game_def} do

  #   # Define a local variable. Since we are not in a function it will have a scope of 0
  #   res = Evaluate.evaluate(game, ["DEFINED", "$GAME.stackById/123abc"])
  #   IO.inspect(res)
  # end


end
