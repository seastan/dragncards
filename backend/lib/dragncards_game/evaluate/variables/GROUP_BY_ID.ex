defmodule DragnCardsGame.Evaluate.Variables.GROUP_BY_ID do
  @moduledoc """
  Shortcut for `$GAME.groupById`.
  """

  def execute(game, _trace) do
    game["groupById"]
  end
end
