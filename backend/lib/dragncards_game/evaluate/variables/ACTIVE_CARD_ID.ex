defmodule DragnCardsGame.Evaluate.Variables.ACTIVE_CARD_ID do
  @moduledoc """
  Returns the id of the card currently being hovered over by the user.

  If `$ACTIVE_CARD_ID` is redefined during an action list by `VAR` or `DEFINE`, all variables that inherit from it will be updated automatically:

  `$ACTIVE_CARD_ID`\\
  └ `$ACTIVE_CARD`\\
      └─ `$ACTIVE_FACE`\\
      └─ `$ACTIVE_TOKENS`\\
  └ `$ACTIVE_GROUP_ID`\\
      └─ `$ACTIVE_GROUP`
  """

  def execute(game, _trace) do
    if game["playerUi"]["activeCardId"] == nil do
      raise "Variable $ACTIVE_CARD_ID is undefined."
    else
      game["playerUi"]["activeCardId"]
    end
  end
end
