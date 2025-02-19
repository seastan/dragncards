defmodule DragnCardsGame.Evaluate.Variables.ACTIVE_GROUP_ID do
  alias DragnCardsGame.Evaluate
  @moduledoc """
  Returns the id of the active group for the player triggering the backend process. The active group is set when a player clicks on a group's dropdown menu. If the user has not clicked on a group's dropdown menu, then the the active group is the one containing the card currently being hovered over.

  If `$ACTIVE_GROUP_ID` is redefined during an action list by `VAR` or `DEFINE`, all variables that inherit from it will be updated automatically:

  `$ACTIVE_GROUP_ID`\\
  └ `$ACTIVE_GROUP`
  """

  def execute(game, trace) do
    cond do
      get_in(game, ["playerUi", "dropdownMenu", "group"]) ->
        get_in(game, ["playerUi", "dropdownMenu", "group"])["id"]
      get_in(game, ["playerUi", "activeCardId"]) ->
        Evaluate.evaluate(game, "$ACTIVE_CARD.groupId", trace ++ ["$ACTIVE_GROUP"])
      true ->
        raise "Variable $ACTIVE_GROUP_ID is undefined."
    end
  end
end
