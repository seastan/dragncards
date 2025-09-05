defmodule DragnCardsGame.Evaluate.Functions.SELECT_CARDS do
  alias DragnCardsGame.{Evaluate, PluginCache}
  alias DragnCards.Plugins
  @moduledoc """
  *Arguments*:
  1. `targetPlayerI` (string like "player1") or `targetPlayerList` (list of such strings)
  2. `selectedCards` (list of card IDs)

  The specified cards will become selected in `targetPlayerI`'s GUI.

  *Returns*:
  (game state) The updated game state.

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
