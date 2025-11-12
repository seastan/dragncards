defmodule DragnCardsGame.Evaluate.Functions.FADE_TEXT_GAME do
  alias DragnCardsGame.Evaluate
  alias DragnCardsGame.Evaluate.Functions.FADE_TEXT_PLAYER
  @moduledoc """
  *Arguments*:
  1. `label` (string) - the text to display

  Displays fading text in the center of the screen for all players in the game.
  This is a convenience function that internally calls FADE_TEXT_PLAYER with $PLAYER_ORDER.
  The text will fade in, hold for 0.5 seconds, then fade out.

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
    fade_text_player_code = ["FADE_TEXT_PLAYER", "$PLAYER_ORDER", label]
    FADE_TEXT_PLAYER.execute(game, fade_text_player_code, trace ++ ["FADE_TEXT_PLAYER"])
  end
end
