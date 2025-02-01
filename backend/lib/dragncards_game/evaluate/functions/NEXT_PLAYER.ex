defmodule DragnCardsGame.Evaluate.Functions.NEXT_PLAYER do
  alias DragnCardsGame.Evaluate
  @moduledoc """
  *Arguments*:
  1. `currentPlayerI` (string like "player1")

  Returns the next player in the game, based on the number of players in the game.


  *Returns*:
  (string like "player2") The id of the next player.

  *Examples*:

  In a 2-player game:
  ```
  ["NEXT_PLAYER", "player1"] -> "player2"
  ```
  In a 3-player game:
  ```
  ["NEXT_PLAYER", "player2"] -> "player3"
  ```
  In a 3-player game:
  ```
  ["NEXT_PLAYER", "player3"] -> "player1"
  ```
  In a 1-player game:
  ```
  ["NEXT_PLAYER", "player1"] -> "player1"
  ```

  """

  @doc """
  Executes the 'NEXT_PLAYER' operation with the given arguments.

  ## Parameters

    - `args`: The arguments required for the 'NEXT_PLAYER' operation.

  ## Returns

  The result of the 'NEXT_PLAYER' operation.
  """
  def execute(game, code, trace) do
    current_player_i = Evaluate.evaluate(game, Enum.at(code, 1), trace ++ ["current_player_i"])
    current_i = String.to_integer(String.slice(current_player_i, -1..-1))
    next_i = current_i + 1
    next_i = if next_i > game["numPlayers"] do 1 else next_i end
    "player" <> Integer.to_string(next_i)
  end


end
