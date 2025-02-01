defmodule DragnCardsGame.Evaluate.Variables.ACTIVE_FACE do
  alias DragnCardsGame.Evaluate
  @moduledoc """
  Returns the face object corresponding to the faceup side of `$ACTIVE_CARD`.
  """

  def execute(game, trace) do
    Evaluate.evaluate(game, "$ACTIVE_CARD.currentFace", trace)
  end
end
