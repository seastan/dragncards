defmodule DragnCardsGame.Evaluate.Functions.FADE_TEXT_GAME do
  alias DragnCardsGame.Evaluate
  alias DragnCardsGame.Evaluate.Functions.FADE_TEXT_PLAYER
  @moduledoc """
  *Arguments*:
  1. `label` (string) - the text to display
  2. `duration` (number, optional) - how long the text stays on screen, in seconds

  Displays fading text in the center of the screen for all players in the game.
  This is a convenience function that internally calls FADE_TEXT_PLAYER with $PLAYER_ORDER.
  The text will fade in, hold for `duration` seconds, then fade out.
  If `duration` is not given, the engine's default hold time is used.
  If `duration` is -1, the text stays on screen until the next fade text message
  replaces it.

  *Returns*:
  (game state) The updated game state with the fade text added for all players.

  *Examples*:

  Display "Game Started!" to all players:
  ```
  ["FADE_TEXT_GAME", "Game Started!"]
  ```

  Display phase transition to all players:
  ```
  ["FADE_TEXT_GAME", "Draw Phase"]
  ```

  Display with token:
  ```
  ["FADE_TEXT_GAME", "All players gain token:resource"]
  ```

  Display "Game Started!" for 4 seconds:
  ```
  ["FADE_TEXT_GAME", "Game Started!", 4]
  ```

  Display "Draw Phase" until the next message replaces it:
  ```
  ["FADE_TEXT_GAME", "Draw Phase", -1]
  ```
  """

  @doc """
  Executes the 'FADE_TEXT_GAME' operation with the given arguments.

  ## Parameters

    - `game`: The current game state
    - `code`: The code containing the function call and arguments
    - `trace`: The execution trace for debugging

  ## Returns

  The updated game state with fade text added for all players.
  """
  def execute(game, code, trace) do
    label = Enum.at(code, 1)
    # Pass the duration through unevaluated, if it was given
    fade_text_player_code = if Enum.count(code) > 2 do
      ["FADE_TEXT_PLAYER", "$PLAYER_ORDER", label, Enum.at(code, 2)]
    else
      ["FADE_TEXT_PLAYER", "$PLAYER_ORDER", label]
    end
    FADE_TEXT_PLAYER.execute(game, fade_text_player_code, trace ++ ["FADE_TEXT_PLAYER"])
  end
end
