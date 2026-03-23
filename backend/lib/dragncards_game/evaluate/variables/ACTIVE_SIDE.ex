defmodule DragnCardsGame.Evaluate.Variables.ACTIVE_SIDE do
  alias DragnCardsGame.Evaluate
  @moduledoc """
  Returns the current side (e.g. "A" or "B") of `$ACTIVE_CARD`.

  Equivalent to `$ACTIVE_CARD.currentSide`.
  """

  def execute(game, trace) do
    Evaluate.evaluate(game, "$ACTIVE_CARD.currentSide", trace)
  end
end
