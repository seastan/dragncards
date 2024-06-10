defmodule DragnCardsGame.Evaluate.Functions.LOAD_CARDS do
  alias DragnCardsGame.{Evaluate, GameUI}
  alias DragnCards.Plugins
  @moduledoc """
  *Arguments*:
  1. `loadListId` (string): The id of a pre-built deck to load. Must be present in `gameDef.preBuiltDecks`.

  *Returns*:
  (game state) The game with the cards from the pre-built deck loaded.
  """

  @doc """
  Executes the 'LOAD_CARDS' operation with the given arguments.

  ## Parameters

    - `args`: The arguments required for the 'LOAD_CARDS' operation.

  ## Returns

  The result of the 'LOAD_CARDS' operation.
  """
  def execute(game, code, trace) do
    load_list_or_id = Evaluate.evaluate(game, Enum.at(code, 1), trace ++ ["load_list"])
    game_def = Plugins.get_game_def(game["options"]["pluginId"])

    # Set the load_list_id
    load_list_id = if is_list(load_list_or_id) do
      nil
    else
      load_list_or_id
    end
    IO.puts("load_list_id: #{load_list_id}")

    # Set the load_list
    load_list = if is_list(load_list_or_id) do
      load_list_or_id
    else
      get_in(game_def, ["preBuiltDecks", load_list_id, "cards"])
    end

    IO.puts("load_list_1")
    IO.inspect(load_list)

    # Run preLoadActionList if it exists
    automation = Map.get(game_def, "automation", %{})
    game = if automation["preLoadActionList"] do
      Evaluate.evaluate(game, ["ACTION_LIST", automation["preLoadActionList"]], trace ++ ["game preLoadActionList"])
    else
      game
    end
    # Run deck's preLoadActionList if it exists
    game = if load_list_id && game_def["preBuiltDecks"][load_list_id]["preLoadActionList"] do
      Evaluate.evaluate(game, ["ACTION_LIST", game_def["preBuiltDecks"][load_list_id]["preLoadActionList"]], trace ++ ["deck preLoadActionList"])
    else
      game
    end

    prev_loaded_card_ids = game["loadedCardIds"]

    game = GameUI.load_cards(game, load_list)

    # Run deck's postLoadActionList if it exists
    game = if load_list_id && game_def["preBuiltDecks"][load_list_id]["postLoadActionList"] do
      Evaluate.evaluate(game, ["ACTION_LIST", game_def["preBuiltDecks"][load_list_id]["postLoadActionList"]], trace ++ ["deck postLoadActionList"])
    else
      game
    end

    # Run postLoadActionList if it exists
    game = if automation["postLoadActionList"] do
      Evaluate.evaluate(game, ["ACTION_LIST", automation["postLoadActionList"]], trace ++ ["game postLoadActionList"])
    else
      game
    end

    # Restore prev_loaded_card_ids
    game = put_in(game, ["loadedCardIds"], prev_loaded_card_ids)

    # Set loadedADeck to true
    put_in(game, ["loadedADeck"], true)
  end


end
