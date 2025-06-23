defmodule DragnCardsGame.Evaluate.Functions.LOOK_AT do
  alias DragnCardsGame.{Evaluate}
  @moduledoc """
  *Arguments*:
  1. `playerI` (string like "player1")
  2. `groupId` (string)
  3. `topN` (number)
  4. `visibility` (boolean)

  Opens up the browse window for the given player, and sets the visibility of the top N cards in the group to the given value.

  To show all cards in the group, set `topN` to `-1`.

  To hide the browse window and hide the cards from the player, see `STOP_LOOKING`.

  *Returns*:
  (game state) The game state with the specified browse window opened.

  *Examples*:

  Look at the top 5 cards of group `$MY_GROUP_ID`:
  ```
  [
    ["LOG", "{{$ALIAS_N}} is looking at the top 5 cards of {{/groupById/$MY_GROUP_ID/label}}."],
    ["LOOK_AT", "$PLAYER_N", "$MY_GROUP_ID", 5, true]
  ]
  ```

  """

  @doc """
  Executes the 'LOOK_AT' operation with the given arguments.

  ## Parameters

    - `args`: The arguments required for the 'LOOK_AT' operation.

  ## Returns

  The result of the 'LOOK_AT' operation.
  """
  def execute(game, code, trace) do
    player_i = Evaluate.evaluate(game, Enum.at(code, 1), trace ++ ["player_i"])
    group_id = Evaluate.evaluate(game, Enum.at(code, 2), trace ++ ["group_id"])
    top_n = Evaluate.evaluate(game, Enum.at(code, 3), trace ++ ["top_n"])
    visibility = Evaluate.evaluate(game, Enum.at(code, 4), trace ++ ["visibility"])
    stack_ids = Evaluate.evaluate(game, "$GAME.groupById.#{group_id}.stackIds", trace ++ ["stack_ids"])
    top_n =
      cond do
        top_n == -1 -> Enum.count(stack_ids)
        top_n > Enum.count(stack_ids) -> Enum.count(stack_ids)
        true -> top_n
      end
    action_list = [
      ["SET", "/playerData/#{player_i}/browseGroup/id", group_id],
      ["SET", "/playerData/#{player_i}/browseGroup/topN", top_n],
      ["FOR_EACH_START_STOP_STEP", "$i", 0, top_n, 1,
        [
          ["VAR", "$CARD_ID", "$GAME.groupById.#{group_id}.parentCardIds.[$i]"],
          ["SET", "/cardById/$CARD_ID/peeking/#{player_i}", visibility]
        ]
      ]
    ];
    Evaluate.evaluate(game, action_list, trace ++ ["action_list"])
  end

end
