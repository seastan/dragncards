defmodule DragnCardsGame.Evaluate.Functions.MOVE_STACKS do
  alias DragnCardsGame.{Evaluate, GameUI}
  @moduledoc """
  *Arguments*:
  1. `origGroupId` (string)
  2. `destGroupId` (string)
  3. `topN` (number, optional, defaults to the length of the stack)
  4. `position` (string, optional, defaults to "shuffle")
  5. `options` (object, optional)

  Moves the top `topN` stacks from the group with the given `origGroupId` to the group with the given `destGroupId`.

  If `topN` is `-1` or is greater than the number of stacks in the origin group, all stacks will be moved.

  The `position` argument can be one of the following:
  - "shuffle": The stacks are shuffled into the destination group.
  - "top": The stacks are inserted at the top of the destination group.
  - "bottom": The stacks are inserted at the bottom of the destination group.

  If the `position` argument is not provided, the default is "shuffle". For a row of cards in play, "top" is the leftmost position and "bottom" is the rightmost position.

  The `options` object can contain the following properties:
  - `allowFlip` (boolean): If false, the cards will ignore the `onCardEnter.currentSide` setting of whatever group they are moving to.

  *Returns*:
  (game state) The game state with the stacks moved.

  *Examples*:

  Move the top 3 stacks from the group called `sharedSetAside` to the group called `player1Discard`:
  ```
  ["MOVE_STACKS", "sharedSetAside", "player1Discard", 3, "top"]
  ```
  Move all stacks from the group called `player1Discard` to bottom of the group called `player1Deck`:
  ```
  ["MOVE_STACKS", "player1Discard", "player1Deck", -1, "bottom"]
  ```
  Shuffle all stacks from the group called `player1Discard` into the group called `player1Deck`:
  ```
  ["MOVE_STACKS", "player1Discard", "player1Deck", -1]
  ```
  Move 10 stacks from the group called `player1Deck` to the rightmost of the group called `player1PlayArea` without flipping the cards:
  ```
  ["MOVE_STACKS", "player1Deck", "player1PlayArea", 10, "bottom", {"allowFlip": false}]
  ```
  """

  @doc """
  Executes the 'MOVE_STACKS' operation with the given arguments.

  ## Parameters

    - `args`: The arguments required for the 'MOVE_STACKS' operation.

  ## Returns

  The result of the 'MOVE_STACKS' operation.
  """
  def execute(game, code, trace) do
    argc = Evaluate.argc(code, 2, 5)
    orig_group_id = Evaluate.evaluate(game, Enum.at(code, 1), trace ++ ["orig_group_id"])
    dest_group_id = Evaluate.evaluate(game, Enum.at(code, 2), trace ++ ["dest_group_id"])
    top_n = if argc >= 3 do Evaluate.evaluate(game, Enum.at(code, 3), trace ++ ["top_n"]) else length(game["groupById"][orig_group_id]["stackIds"]) end
    position = if argc >= 4 do Evaluate.evaluate(game, Enum.at(code, 4), trace ++ ["position"]) else "shuffle" end
    options = if argc >= 5 do Evaluate.evaluate(game, Enum.at(code, 4), trace ++ ["options"] ) else nil end
    GameUI.move_stacks(game, orig_group_id, dest_group_id, top_n, position, options)
  end


end
