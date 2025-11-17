defmodule DragnCardsGame.Evaluate.Variables.CARD_DB do
  @moduledoc """
  Returns the card database object.

  *Examples*:

  ```
  "$CARD_DB.51223bd0.A.hitPoints" # Returns the hitPoints value of side A for the card from the database with databaseId 51223bd0.
  ```
  """
  alias DragnCardsGame.{PluginCache}

  def execute(game, _trace) do
    PluginCache.get_card_db_cached(game["pluginId"])
  end
end
