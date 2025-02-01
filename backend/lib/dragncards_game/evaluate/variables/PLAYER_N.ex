defmodule DragnCardsGame.Evaluate.Variables.PLAYER_N do
  @moduledoc """
  Returns the id of the player who triggered the backend process, such as `player1` or `player2`.

  If `$PLAYER_N` is redefined by `VAR` or `DEFINE`, all variables that inherit from it will be updated automatically:

  `$PLAYER_N`\\
  └ `$ALIAS_N`

  """

  def execute(game, _trace) do
    if game["playerUi"]["playerN"] == nil do
      raise "Variable $PLAYER_N is undefined."
    else
      game["playerUi"]["playerN"]
    end
  end
end
