defmodule DragnCardsGame.Evaluate.Variables.ACTIVE_GROUP do
  alias DragnCardsGame.Evaluate
  @moduledoc """
  Returns the group object corresponding to `$ACTIVE_GROUP_ID`.
  """

  def execute(game, trace) do
    Evaluate.evaluate(game, "$GAME.groupById.$ACTIVE_GROUP_ID", trace ++ ["$ACTIVE_GROUP"])
  end
end
