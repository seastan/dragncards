defmodule DragnCardsGame.Evaluate.Variables.PLAYER_LIST do
  alias DragnCardsGame.Evaluate

  @moduledoc """
  Returns a list of player ids, starting from player1. So if there are 1 players, the list will be `["player1", "player2", "player3"]`.
  """

  def execute(game, trace) do
    num_players = game["numPlayers"]
    player_list = Enum.map(1..num_players, fn i -> "player#{i}" end)
    player_list
  end
end
