defmodule DragnCardsGame.Evaluate.Functions.LOAD_CARDS do
  alias DragnCardsGame.{Evaluate, GameUI, PluginCache}
  alias DragnCards.{Plugins, CustomCardDb}
  @moduledoc """
  *Arguments*:
  1. `loadListId` (string) or `loadList` (list)

  Takes either the id of a pre-built deck to load (must be present in `gameDef.preBuiltDecks`) or a raw load list.

  *Returns*:
  (game state) The game with the cards from the pre-built deck loaded.

  *Examples*:

  Load a pre-built deck with the id `starterDeck`:
  ```
  ["LOAD_CARDS", "starterDeck"]
  ```

  Load a raw list of cards:
  ```
  ["LOAD_CARDS",
    ["LIST",
      {"databaseId": "da365fcc-385e-4824-901a-30381b769561", "loadGroupId": "player1Deck", "quantity": 1},
      {"databaseId": "4c4cccd3-576a-41f1-8b6c-ba11b4cc3d4b", "loadGroupId": "player1Play1", "quantity": 1}
    ]
  ]
  ```
  """

  def add_load_code_to_history(game, load_code, player_n, trace) do

    new_entry = %{
      "loadCode" => load_code,
      "playerN" => player_n
    }

    old_load_list_history = get_in(game, ["loadCardsHistory"]) || []
    new_load_list_history = old_load_list_history ++ [new_entry]

    game
    |> put_in(["loadCardsHistory"], new_load_list_history)
  end


  @doc """
  Executes the 'LOAD_CARDS' operation with the given arguments.

  ## Parameters

    - `args`: The arguments required for the 'LOAD_CARDS' operation.

  ## Returns

  The result of the 'LOAD_CARDS' operation.
  """
  def execute(game, code, trace) do
    try do
      load_list_or_id = Evaluate.evaluate(game, Enum.at(code, 1), trace ++ ["load_list"])
      player_n = Evaluate.evaluate(game, "$PLAYER_N", trace ++ ["player_n"])
      user_id = GameUI.get_user_id_from_player_n(game, player_n)

      game_def = try do
        PluginCache.get_game_def_cached(game["pluginId"])
      rescue
        e ->
          reraise "LOAD_CARDS failed while loading game definition for plugin #{inspect(game["pluginId"])}: #{Exception.message(e)}", __STACKTRACE__
      end

      card_db = try do
        DragnCardsGame.PluginCache.get_card_db_cached(game["pluginId"])
      rescue
        e ->
          reraise "LOAD_CARDS failed while loading card database for plugin #{inspect(game["pluginId"])}: #{Exception.message(e)}", __STACKTRACE__
      end

      if !is_list(load_list_or_id) and get_in(game_def, ["preBuiltDecks", load_list_or_id]) == nil do
        available_decks = (game_def["preBuiltDecks"] || %{}) |> Map.keys() |> Enum.join(", ")
        raise("LOAD_CARDS failed: Could not find pre-built deck with id '#{inspect(load_list_or_id)}' in game definition. Available decks: [#{available_decks}]")
      end

      # Set the load_list_id
      load_list_id = if is_list(load_list_or_id) do
        nil
      else
        load_list_or_id
      end

      # Set the load_list
      load_list = if is_list(load_list_or_id) do
        load_list_or_id
      else
        cards = get_in(game_def, ["preBuiltDecks", load_list_id, "cards"])
        if cards == nil do
          raise("LOAD_CARDS failed: Pre-built deck '#{load_list_id}' exists but has no 'cards' field.")
        end
        cards
      end

      # Validate the load_list
      if !is_list(load_list) do
        raise("LOAD_CARDS failed: Expected load_list to be a list, got: #{inspect(load_list)}")
      end

      Enum.with_index(load_list, fn item, index ->
        if !is_map(item) or !Map.has_key?(item, "databaseId") or !Map.has_key?(item, "loadGroupId") or !Map.has_key?(item, "quantity") do
          raise("LOAD_CARDS failed: Card at index #{index} in load list must be a map with keys: databaseId, loadGroupId, and quantity. Got: #{inspect(item)}")
        end
      end)

      # Attach the load list to the game state
      prev_load_list = game["loadList"] || []

      # Pre-process the load list
      load_list = Enum.map(load_list, fn load_list_item ->
        # If the load_list_item has a "cardDetails"
        database_id = get_in(load_list_item, ["databaseId"])

        cardDetails =
          cond do
            Map.has_key?(load_list_item, "cardDetails") ->
              load_list_item["cardDetails"]

            Map.has_key?(load_list_item, "authorId") ->
              CustomCardDb.get_card_details_for_user(game["pluginId"], user_id, database_id)

            database_id != nil ->
              card_details = {:ok, card_db[database_id]}
              case card_details do
                {:ok, nil} -> raise "Card with databaseId #{database_id} not found."
                {:ok, card_details} -> card_details
                :error -> raise "Card with databaseId #{database_id} not found."
              end

            true ->
              raise "Map must contain either 'databaseId' or 'cardDetails'"
          end

        quantity = Map.fetch!(load_list_item, "quantity")

        loadGroupId = Map.fetch!(load_list_item, "loadGroupId")

        loadGroupId =
          if String.contains?(loadGroupId, "playerN") and player_n == nil do
            raise "Tried to load a card into player group #{loadGroupId}, but no player was specified. Are you sitting in a seat?"
          else
            String.replace(loadGroupId, "playerN", player_n || "")
          end

        possibleGroupIds = Map.keys(game["groupById"])

        if loadGroupId not in possibleGroupIds do
          raise "Tried to load a card into a group that doesn't exist: #{loadGroupId}"
        end

        load_list_item_processed = %{
          "databaseId" => database_id,
          "cardDetails" => cardDetails,
          "quantity" => quantity,
          "loadGroupId" => loadGroupId,
          "left" => load_list_item["left"],
          "top" => load_list_item["top"]
        }

      end)
      game = put_in(game, ["loadList"], load_list)

      # Run preLoadActionList if it exists
      game = try do
        GameUI.do_automation_action_list(game, "preLoadActionList", trace ++ ["preLoadActionList"])
      rescue
        e ->
          reraise "LOAD_CARDS failed during preLoadActionList execution: #{Exception.message(e)}", __STACKTRACE__
      end

      game = if load_list_id && game_def["preBuiltDecks"][load_list_id]["preLoadActionList"] do
        if game["automationEnabled"] do
          try do
            Evaluate.evaluate(game, ["ACTION_LIST", game_def["preBuiltDecks"][load_list_id]["preLoadActionList"]], trace ++ ["deck preLoadActionList"])
          rescue
            e ->
              reraise "LOAD_CARDS failed during deck '#{load_list_id}' preLoadActionList execution: #{Exception.message(e)}", __STACKTRACE__
          end
        else
          Evaluate.evaluate(game, ["LOG", "Skipping deck's preLoadActionList because automation is disabled."], trace ++ ["action_list_id"])
        end
      else
        game
      end

      prev_loaded_card_ids = game["loadedCardIds"]
      game = put_in(game, ["loadedCardIds"], [])

      old_game = game
      game = try do

        {reduce_load_list_time, game} = :timer.tc(fn ->
          Enum.reduce(Enum.with_index(game["loadList"]), game, fn {load_list_item, index}, acc ->
            try do
              GameUI.load_card(acc, game_def, load_list_item, trace ++ ["load_cards", "item_#{index}"])
            rescue
              e ->
                database_id = load_list_item["databaseId"]
                card_name = get_in(load_list_item, ["cardDetails", "A", "name"]) || "Unknown"
                reraise "Failed to load card at index #{index}: '#{card_name}' (databaseId: #{database_id}): #{Exception.message(e)}", __STACKTRACE__
            end
          end)
        end)
        IO.puts("Enum.reduce (load_list processing) execution time: #{reduce_load_list_time} microseconds")

        game = GameUI.shuffle_changed_decks(game, old_game, game_def)

      rescue
        e ->
          deck_info = if load_list_id, do: " from deck '#{load_list_id}'", else: " from custom list"
          reraise "LOAD_CARDS failed while loading #{length(game["loadList"])} card(s)#{deck_info}: #{Exception.message(e)}", __STACKTRACE__
      end

      # Run deck's postLoadActionList if it exists
      game = if load_list_id && game_def["preBuiltDecks"][load_list_id]["postLoadActionList"] do
        if game["automationEnabled"] do
          try do
            Evaluate.evaluate(game, ["ACTION_LIST", game_def["preBuiltDecks"][load_list_id]["postLoadActionList"]], trace ++ ["deck postLoadActionList"])
          rescue
            e ->
              reraise "LOAD_CARDS failed during deck '#{load_list_id}' postLoadActionList execution: #{Exception.message(e)}", __STACKTRACE__
          end
        else
          Evaluate.evaluate(game, ["LOG", "Skipping deck's postLoadActionList because automation is disabled."], trace ++ ["action_list_id"])
        end
      else
        game
      end

      # Run postLoadActionList if it exists
      game = try do
        GameUI.do_automation_action_list(game, "postLoadActionList", trace ++ ["postLoadActionList"])
      rescue
        e ->
          reraise "LOAD_CARDS failed during postLoadActionList execution: #{Exception.message(e)}", __STACKTRACE__
      end

      # Restore prev_loaded_card_ids and load_list
      game = put_in(game, ["loadedCardIds"], prev_loaded_card_ids)
      game = put_in(game, ["loadList"], prev_load_list)

      # Add the load code to the history
      game = add_load_code_to_history(game, code, player_n, trace ++ ["add_load_code_to_history"])

      # Set loadedADeck to true
      put_in(game, ["loadedADeck"], true)
    rescue
      e ->
        # Re-raise with additional context if this is not already a wrapped error
        if String.starts_with?(Exception.message(e), "LOAD_CARDS failed") do
          reraise e, __STACKTRACE__
        else
          reraise "LOAD_CARDS failed with unexpected error: #{Exception.message(e)}", __STACKTRACE__
        end
    end
  end


end
