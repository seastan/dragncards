defmodule DragnCardsGame.Evaluate.Variables.PLAYER_ORDER do
  alias DragnCardsGame.Evaluate

  @moduledoc """
  Returns a list of player ids in turn order. So if there are 4 players and `player2` is first, the list will be `["player2", "player3", "player4", "player1"]`.
  """

  def execute(game, trace) do
    num_players = game["numPlayers"]
    first_player = game["firstPlayer"]
    {player_order, _} = Enum.reduce(0..num_players-1, {[], first_player}, fn _, {acc, player_i} ->
      next_player = Evaluate.evaluate(game, ["NEXT_PLAYER", player_i], trace ++ ["$PLAYER_ORDER"])
      {acc ++ [player_i], next_player}
    end)
    player_order
  end
end
