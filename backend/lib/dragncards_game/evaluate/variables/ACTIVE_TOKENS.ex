defmodule DragnCardsGame.Evaluate.Variables.ACTIVE_TOKENS do
  alias DragnCardsGame.Evaluate
  @moduledoc """
  Returns the tokens object corresponding to `$ACTIVE_CARD`.
  """

  def execute(game, trace) do
    Evaluate.evaluate(game, "$ACTIVE_CARD.tokens", trace)
  end
end
