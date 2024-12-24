defmodule DragnCardsGame.Evaluate.Variables.GAME_DEF do
  @moduledoc """
  Returns the game definition object that was used to create the game. Can be used for reference purposes, but note that the game definition cannot be updated during the game.

  *Examples*:

  ```
  ["$GAME_DEF.gameProperties.hitPoints.default"] # Returns the default value for the hitPoints game property from the game definition.
  ```
  """



  alias DragnCardsGame.{PluginCache}

  def execute(game, _trace) do
    PluginCache.get_game_def_cached(game["options"]["pluginId"])
  end
end
