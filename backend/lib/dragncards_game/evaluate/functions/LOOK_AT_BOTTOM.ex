defmodule DragnCardsGame.Evaluate.Functions.LOOK_AT_BOTTOM do
  alias DragnCardsGame.{Evaluate}

  def execute(game, code, trace) do
    player_i = Evaluate.evaluate(game, Enum.at(code, 1), trace ++ ["player_i"])
    group_id = Evaluate.evaluate(game, Enum.at(code, 2), trace ++ ["group_id"])
    bottom_n = Evaluate.evaluate(game, Enum.at(code, 3), trace ++ ["bottom_n"])
    visibility = Evaluate.evaluate(game, Enum.at(code, 4), trace ++ ["visibility"])

    stack_ids = Evaluate.evaluate(game, "$GAME.groupById.#{group_id}.stackIds", trace ++ ["stack_ids"])
    count = Enum.count(stack_ids)

    bottom_n =
      if bottom_n == -1 do
        count
      else
        min(bottom_n, count)
      end

    start_i = max(count - bottom_n, 0)

    action_list = [
      ["SET", "/playerData/#{player_i}/browseGroup/id", group_id],
      ["SET", "/playerData/#{player_i}/browseGroup/topN", bottom_n],
      ["SET", "/playerData/#{player_i}/browseGroup/position", "bottom"],
      ["FOR_EACH_START_STOP_STEP", "$i", start_i, count, 1,
        [
          ["VAR", "$CARD_ID", "$GAME.groupById.#{group_id}.parentCardIds.[$i]"],
          ["SET", "/cardById/$CARD_ID/peeking/#{player_i}", visibility]
        ]
      ]
    ]

    Evaluate.evaluate(game, action_list, trace ++ ["action_list"])
  end
end