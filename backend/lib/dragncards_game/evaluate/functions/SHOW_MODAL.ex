defmodule DragnCardsGame.Evaluate.Functions.SHOW_MODAL do
  alias DragnCardsGame.Evaluate
  @moduledoc """
  *Arguments*:
  1. `targetPlayerI` (string like "player1") or `targetPlayerList` (list of such strings)
  2. `modalId` (string) - which dialog to open; one of:
     - `"prebuilt_deck"`: load a prebuilt deck (gameDef.preBuiltDecks)
     - `"public_deck"`: load a public deck
     - `"custom_decks"`: the custom deck builder
     - `"custom_content"`: custom cards
     - `"card"`: spawn a card
     - `"settings"`: preferences

  Opens a dialog on the target player(s)' screens, as if they had picked it from
  the menu. It only opens on screens where that seat is taken; it has no effect
  on the game state and is not replayed by undo or redo.

  *Returns*:
  (game state) The game state, unchanged apart from the pending GUI update.

  *Examples*:

  After the number of players is chosen, have player1 pick a quest:
  ```
  ["SHOW_MODAL", "player1", "prebuilt_deck"]
  ```

  Have every player load a deck:
  ```
  ["SHOW_MODAL", "$PLAYER_ORDER", "prebuilt_deck"]
  ```
  """

  @modal_ids ["prebuilt_deck", "public_deck", "custom_decks", "custom_content", "card", "settings"]

  @doc """
  Executes the 'SHOW_MODAL' operation with the given arguments.

  ## Parameters

    - `args`: The arguments required for the 'SHOW_MODAL' operation.

  ## Returns

  The result of the 'SHOW_MODAL' operation.
  """
  def execute(game, code, trace) do
    targets = Evaluate.evaluate(game, Evaluate.arg(code, 1), ["target_player_n" | trace])
    target_list = if is_list(targets), do: targets, else: [targets]
    modal_id = Evaluate.evaluate(game, Evaluate.arg(code, 2), ["modal_id" | trace])

    if modal_id not in @modal_ids do
      raise "SHOW_MODAL failed: unknown modalId #{inspect(modal_id)}. Expected one of: #{Enum.join(@modal_ids, ", ")}."
    end

    Enum.each(target_list, fn player_i ->
      if not Map.has_key?(game["playerData"] || %{}, player_i) do
        raise "SHOW_MODAL failed: player #{inspect(player_i)} not found in game."
      end
    end)

    # Delivered after the action (room_channel), to every client; each client
    # applies the entry for its own seat to its playerUi.
    gui_updates = Enum.map(target_list, fn player_i ->
      %{"targetPlayerN" => player_i, "updates" => %{"showModal" => modal_id}}
    end)

    Map.put(game, "pendingGuiUpdates", Map.get(game, "pendingGuiUpdates", []) ++ gui_updates)
  end
end
