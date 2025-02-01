defmodule DragnCardsGame.Evaluate.Variables.ALIAS_N do
  alias DragnCardsGame.Evaluate
  @moduledoc """
  Returns the alias of the player corresponding to `$PLAYER_N`.
  """

  def log_alias_n(player_n, alias_n) do
    "[#{player_n}/#{alias_n}]"
  end

  def execute(game, trace) do
      try do
        player_n = Evaluate.evaluate(game, "$PLAYER_N", trace ++ ["$ALIAS_N"])
        player_alias = get_in(game, ["playerInfo", player_n, "alias"]) || "#{player_n}"
        log_alias_n(player_n, player_alias)
      rescue
        _ ->
          log_alias_n("player1", "player1")
      end
  end
end
