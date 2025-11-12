defmodule DragnCardsGame.Evaluate.Functions.LOAD_CARDS do
  alias DragnCardsGame.{Evaluate, GameUI, PluginCache}
  alias DragnCards.Plugins
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
    load_list_or_id = Evaluate.evaluate(game, Enum.at(code, 1), trace ++ ["load_list"])
    game_def = PluginCache.get_game_def_cached(game["pluginId"])

    if !is_list(load_list_or_id) and get_in(game_def, ["preBuiltDecks", load_list_or_id]) == nil do
      raise("Could not find pre-built deck with id: #{inspect(load_list_or_id)} in game definition.")
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
      get_in(game_def, ["preBuiltDecks", load_list_id, "cards"])
    end

    # Validate the load_list
    if !is_list(load_list) do
      raise("Expected load_list to be a list, got: #{inspect(load_list)}")
    end
    Enum.each(load_list, fn item ->
      if !is_map(item) or !Map.has_key?(item, "databaseId") or !Map.has_key?(item, "loadGroupId") or !Map.has_key?(item, "quantity") do
        raise("Each card in the load list must be a map with keys: databaseId, loadGroupId, and quantity. Got: #{inspect(item)}")
      end
    end)

    # Run preLoadActionList if it exists
    game = GameUI.do_automation_action_list(game, "preLoadActionList", trace ++ ["preLoadActionList"])

    game = if load_list_id && game_def["preBuiltDecks"][load_list_id]["preLoadActionList"] do
      if game["automationEnabled"] do
        Evaluate.evaluate(game, ["ACTION_LIST", game_def["preBuiltDecks"][load_list_id]["preLoadActionList"]], trace ++ ["deck preLoadActionList"])
      else
        Evaluate.evaluate(game, ["LOG", "Skipping deck's preLoadActionList because automation is disabled."], trace ++ ["action_list_id"])
      end
    else
      game
    end

    prev_loaded_card_ids = game["loadedCardIds"]

    player_n = GameUI.get_player_n(game)
    user_id = GameUI.get_user_id_from_player_n(game, player_n)
    game = GameUI.load_cards(game, load_list, player_n, user_id, trace ++ ["load_cards"])

    # Run deck's postLoadActionList if it exists
    game = if load_list_id && game_def["preBuiltDecks"][load_list_id]["postLoadActionList"] do
      if game["automationEnabled"] do
        Evaluate.evaluate(game, ["ACTION_LIST", game_def["preBuiltDecks"][load_list_id]["postLoadActionList"]], trace ++ ["deck postLoadActionList"])
      else
        Evaluate.evaluate(game, ["LOG", "Skipping deck's postLoadActionList because automation is disabled."], trace ++ ["action_list_id"])
      end
    else
      game
    end

    # Run postLoadActionList if it exists
    game = GameUI.do_automation_action_list(game, "postLoadActionList", trace ++ ["postLoadActionList"])

    # Restore prev_loaded_card_ids
    game = put_in(game, ["loadedCardIds"], prev_loaded_card_ids)

    # Add the load code to the history
    game = add_load_code_to_history(game, code, player_n, trace ++ ["add_load_code_to_history"])

    # Set loadedADeck to true
    put_in(game, ["loadedADeck"], true)
  end


end
