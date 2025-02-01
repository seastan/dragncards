defmodule DragnCardsGame.Evaluate.Variables.PLAYER_DATA do
  @moduledoc """
  Shorthand for `$GAME.playerData`
  """

  def execute(game, _trace) do
    game["playerData"]
  end
end
