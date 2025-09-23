defmodule DragnCardsGame.Evaluate.Functions.SELECT_CARDS do
  alias DragnCardsGame.{Evaluate, PluginCache}
  alias DragnCards.Plugins
  @moduledoc """
  Updates the multiSelect GUI state for specific players by setting which cards are selected.
  This enables multi-selection functionality in the client interface and automatically
  enables the multiSelect mode.

  *Arguments*:
  1. `targetPlayerI` (string like "player1") or `targetPlayerList` (list of such strings)
  2. `selectedCards` (list of card IDs)

  The specified cards will become selected in the target player(s)'s GUI, enabling
  multi-selection mode and highlighting the selected cards.

  *Examples*:

  ```elixir
  # Select specific cards for player1
  ["SELECT_CARDS", "player1", ["LIST", "a27c4ed1-2cb5-43af-b49f-2a9fc7f202cf"]]

  # Select cards for multiple players
  ["SELECT_CARDS", ["player1", "player2"], ["LIST", "a27c4ed1-2cb5-43af-b49f-2a9fc7f202cf"]]

  # Select cards for all players
  ["SELECT_CARDS", $PLAYER_ORDER, ["LIST", "a27c4ed1-2cb5-43af-b49f-2a9fc7f202cf"]]

  # Clear selection for a player by passing empty array
  ["SELECT_CARDS", "player1", []]

  # Select all cards in a player's hand
  ["SELECT_CARDS", "player1", "$GAME.groupById.player1Hand.parentCardIds"]

  # Select cards dynamically based on game state
  ["SELECT_CARDS", "$PLAYER_N", ["SOME_CUSTOM_FUNCTION_THAT_RETURNS_A_LIST_OF_CARD_IDS"]]
  ```

  *GUI Effect*:
  - Sets `playerUi.multiSelect.enabled = true`
  - Sets `playerUi.multiSelect.cardIds = selectedCards`
  - Only affects the specified target players
  - Cards become visually selected in the client interface
  - This only affects the GUI, not the game state, so if a user refreshes their webpage the selection will be lost.

  *Returns*:
  (game state) The updated game state with pending GUI updates.

  """

  @doc """
  Executes the 'SELECT_CARDS' operation with the given arguments.

  ## Parameters

    - `args`: The arguments required for the 'SELECT_CARDS' operation.

  ## Returns

  The result of the 'SELECT_CARDS' operation.
  """

  def execute(game, code, trace) do
    target_player_list = Evaluate.evaluate(game, Enum.at(code, 1), trace ++ ["target_player_n"])
    target_player_list = if is_list(target_player_list) do
      target_player_list
    else
      [target_player_list]
    end
    selected_card_ids = Evaluate.evaluate(game, Enum.at(code, 2), trace ++ ["selected_card_ids"])

    # Store GUI updates in the game state to be processed later
    gui_updates = Enum.map(target_player_list, fn target_player_n ->
      %{
        "targetPlayerN" => target_player_n,
        "updates" => %{
          "multiSelect" => %{
            "enabled" => true,
            "cardIds" => selected_card_ids
          }
        }
      }
    end)

    # Add GUI updates to the game state's pending GUI messages
    existing_gui_updates = Map.get(game, "pendingGuiUpdates", [])
    game = Map.put(game, "pendingGuiUpdates", existing_gui_updates ++ gui_updates)

    game
  end

end
