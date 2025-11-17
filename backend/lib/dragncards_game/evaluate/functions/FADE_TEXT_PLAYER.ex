defmodule DragnCardsGame.Evaluate.Functions.FADE_TEXT_PLAYER do
  alias DragnCardsGame.Evaluate
  @moduledoc """
  *Arguments*:
  1. `playerI` (string or list of strings) - player(s) to display text to (e.g., "player1")
  2. `label` (string) - the text to display

  Displays fading text in the center of the screen for the specified player(s).
  The text will fade in, hold for 0.5 seconds, then fade out.

  *Returns*:
  (game state) The updated game state with the fade text added.

  *Examples*:

  Display "Your Turn!" to player1:
  ```
  ["FADE_TEXT_PLAYER", "player1", "Your Turn!"]
  ```

  Display "Draw Phase" to all players:
  ```
  ["FADE_TEXT_PLAYER", ["player1", "player2", "player3"], "Draw Phase"]
  ```

  Display to the triggering player:
  ```
  ["FADE_TEXT_PLAYER", "$PLAYER_N", "You gained a token:resource"]
  ```
  """

  @doc """
  Executes the 'FADE_TEXT_PLAYER' operation with the given arguments.

  ## Parameters

    - `game`: The current game state
    - `code`: The code containing the function call and arguments
    - `trace`: The execution trace for debugging

  ## Returns

  The updated game state with fade text added.
  """
  def execute(game, code, trace) do
    player_ids = Evaluate.evaluate(game, Enum.at(code, 1), trace ++ ["player_ids"])
    label = Evaluate.evaluate(game, Enum.at(code, 2), trace ++ ["label"])

    # Normalize to list
    player_id_list = if is_list(player_ids), do: player_ids, else: [player_ids]

    # Validate all player ids exist
    Enum.each(player_id_list, fn player_id ->
      if not Map.has_key?(game["playerData"] || %{}, player_id) do
        raise "FADE_TEXT_PLAYER failed: player '#{player_id}' not found in game."
      end
    end)

    # Get existing fadeText structure or initialize
    fade_text = game["fadeText"] || %{"player" => %{}, "card" => %{}}

    # Add label to each player's list
    updated_player_map = Enum.reduce(player_id_list, fade_text["player"] || %{}, fn player_id, acc ->
      player_list = acc[player_id] || []
      Map.put(acc, player_id, player_list ++ [label])
    end)

    updated_fade_text = put_in(fade_text, ["player"], updated_player_map)

    # Update the game state
    Map.put(game, "fadeText", updated_fade_text)
  end
end
