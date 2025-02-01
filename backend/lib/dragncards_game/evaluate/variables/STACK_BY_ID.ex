defmodule DragnCardsGame.Evaluate.Variables.STACK_BY_ID do
  @moduledoc """
  Shortcut for `$GAME.stackById`.
  """

  def execute(game, _trace) do
    game["stackById"]
  end
end
