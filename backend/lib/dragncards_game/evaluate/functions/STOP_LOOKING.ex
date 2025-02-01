defmodule DragnCardsGame.Evaluate.Functions.STOP_LOOKING do
  alias DragnCardsGame.{Evaluate}
  @moduledoc """
  *Arguments*:
  1. `playerI` (string like "player1")
  2. `option` (string, optional, defaults to "hide")

  Closes the browse window for the given player. By default it sets that player's visibility of all cards in the group to false, but
  if `option` is `keepPeeking`, it keeps the visibility of the cards as it was when the browse window was opened.

  To shuffle the cards in the group after closing the browse window, see `SHUFFLE_GROUP`.

  *Returns*:
  (game state) The game state with the browse window closed.


  """

  @doc """
  Executes the 'STOP_LOOKING' operation with the given arguments.

  ## Parameters

    - `args`: The arguments required for the 'STOP_LOOKING' operation.

  ## Returns

  The result of the 'STOP_LOOKING' operation.
  """
  def execute(game, code, trace) do
    argc = Evaluate.argc(code, 1, 2)
    player_i = Evaluate.evaluate(game, Enum.at(code, 1), trace ++ ["player_i"])
    option = if argc > 1 do
      Evaluate.evaluate(game, Enum.at(code, 2), trace ++ ["keep_peeking"])
    else
      "hide"
    end
    browse_group_id = Evaluate.evaluate(game, "$GAME.playerData.#{player_i}.browseGroup.id", trace ++ ["browse_group_id"])
    if browse_group_id do
      game = Evaluate.evaluate(game, ["SET", "/playerData/#{player_i}/browseGroup/id", nil], trace ++ ["set_browse_group_id"])
      game = Evaluate.evaluate(game, ["SET", "/playerData/#{player_i}/browseGroup/topN", nil], trace ++ ["set_browse_group_top_n"])
      if option == "keepPeeking" do
        game
      else
        action_list = [
          ["FOR_EACH_VAL", "$CARD_ID", "$GAME.groupById.#{browse_group_id}.parentCardIds", [
            ["SET", "/cardById/$CARD_ID/peeking/#{player_i}", false]
          ]]
        ];
        Evaluate.evaluate(game, action_list, trace ++ ["action_list"])
      end
    else
      game
    end
  end

end
