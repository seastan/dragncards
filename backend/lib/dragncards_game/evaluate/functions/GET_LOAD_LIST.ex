defmodule DragnCardsGame.Evaluate.Functions.GET_LOAD_LIST do
  alias DragnCardsGame.{Evaluate, GameUI}
  alias DragnCards.Plugins
  @moduledoc """
  *Arguments*:
  1. `loadListId` (string)

  Takes either the id of a pre-built deck to load (must be present in `gameDef.preBuiltDecks`) and returns a load list.
  The returned list can be manipulated before being passed to `LOAD_CARDS`.

  *Returns*:
  (list) The game with the cards from the pre-built deck loaded.

  *Examples*:

  Get the load list for `starterDeck`:
  ```
  ["GET_LOAD_LIST", "starterDeck"]
  ```

  Example return value:
  ```
  [
    %{"databaseId" => "da365fcc-385e-4824-901a-30381b769561", "loadGroupId" => "player1Deck", "quantity" => 1},
    %{"databaseId" => "4c4cccd3-576a-41f1-8b6c-ba11b4cc3d4b", "loadGroupId" => "player1Play1", "quantity" => 1}
  ]
  ```

  Load a random card from the `starterDeck`:
  ```
  ["LOAD_CARDS", ["CHOOSE_N", ["GET_LOAD_LIST", "starterDeck"], 1]]
  ```

  """

  @doc """
  Executes the 'GET_LOAD_LIST' operation with the given arguments.

  ## Parameters

    - `args`: The arguments required for the 'GET_LOAD_LIST' operation.

  ## Returns

  The result of the 'GET_LOAD_LIST' operation.
  """
  def execute(game, code, trace) do
    load_list_id = Evaluate.evaluate(game, Enum.at(code, 1), trace ++ ["load_list"])
    game_def = Plugins.get_game_def(game["options"]["pluginId"])

    get_in(game_def, ["preBuiltDecks", load_list_id, "cards"])

    case get_in(game_def, ["preBuiltDecks", load_list_id]) do
      %{} = pre_built_deck ->
        pre_built_deck["cards"]
      nil ->
        raise("Could not find pre-built deck with id: #{inspect(load_list_id)} in game definition.")
    end

  end


end
