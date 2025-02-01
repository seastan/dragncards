defmodule DragnCardsGame.Evaluate.Functions.FACEUP_NAME_FROM_CARD_ID do
  alias DragnCardsGame.Evaluate
  @moduledoc """
  *Arguments*:
  1. `cardId` (string)

  Gets the name of the faceup side of card `cardId`.

  *Returns*:
  (string) The name of the faceup side of card `cardId`.

  *Example*
  ```
  ["LOG", "$ALIAS_N", " added 1 damage token to ", ["FACEUP_NAME_FROM_CARD_ID", "$CARD_ID"]]
  ```
  """

  @doc """
  Executes the 'FACEUP_NAME_FROM_CARD_ID' operation with the given arguments.

  ## Parameters

    - `args`: The arguments required for the 'FACEUP_NAME_FROM_CARD_ID' operation.

  ## Returns

  The result of the 'FACEUP_NAME_FROM_CARD_ID' operation.
  """
  def execute(game, code, trace) do
    card_id = Evaluate.evaluate(game, Enum.at(code, 1), trace ++ ["card_id"])
    card = game["cardById"][card_id]
    face = card["sides"][card["currentSide"]]
    face["name"]
  end


end
