defmodule DragnCardsGame.Evaluate.Variables.CARD_BY_ID do
  @moduledoc """
  Shortcut for `$GAME.cardById`.
  """

  def execute(game, _trace) do
    game["cardById"]
  end
end
