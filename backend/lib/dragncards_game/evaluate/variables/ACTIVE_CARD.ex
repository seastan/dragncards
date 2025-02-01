defmodule DragnCardsGame.Evaluate.Variables.ACTIVE_CARD do
  alias DragnCardsGame.Evaluate
  @moduledoc """
  Returns the card object corresponding to `$ACTIVE_CARD_ID`.
  """

  def execute(game, trace) do
    Evaluate.evaluate(game, "$GAME.cardById.$ACTIVE_CARD_ID", trace)
  end
end
