defmodule DragnCardsGame.Evaluate.Functions.MOVE_STACK do
  alias DragnCardsGame.{Evaluate, GameUI}
  @moduledoc """
  *Arguments*:
  1. `stackId` (string)
  2. `destGroupId` (string)
  3. `destStackIndex` (number)
  4. `options` (object) (optional)

  Takes the stack with the given `stackId` and inserts it into the group with the given `destGroupId` at stack index `destStackIndex`.

  If `destStackIndex` is -1, the stack will be inserted at the end of the group.

  If the `options` object contains `{"combine": "left"|"right"|"top"|"bottom"}`, then instead of inserting it at `destStackIndex`, the stack will be attached to the back of the stack at `destStackIndex` in the direction specified.

  If the `options` object contains `{"allowFlip": false}`, then all the cards in the stack will ignore the `onCardEnter.currentSide` setting of whatever group they are moving to.

  *Returns*:
  (game state) The game state with the stack moved.

  *Examples*:

  Move the stack associated with the active card, with all its attachments, to the end of a group called `sharedSetAside`:
  ```
  ["MOVE_STACK", "$ACTIVE_CARD.stackId", "sharedSetAside", -1]
  ```

  Move the stack associated with the active card to the beginning of a group called `player1Discard`:
  ```
  ["MOVE_STACK", "$ACTIVE_CARD.stackId", "player1Discard", 0]
  ```
  Note that is `player1Discard` has the `"canHaveAttachments": false` property set, the stack taken apart when and all cards will be given their own stack.

  Also note that moving an entire stack to a discard in this way might not result in the intended behavior if you have cards in that stack that should be assigned to different discard piles. You may want to loop through the stack instead and discard each card to its associated discard pile.

  """

  @doc """
  Executes the 'MOVE_STACK' operation with the given arguments.

  ## Parameters

    - `args`: The arguments required for the 'MOVE_STACK' operation.

  ## Returns

  The result of the 'MOVE_STACK' operation.
  """
  def execute(game, code, trace) do
    argc = Evaluate.argc(code, 3, 4)
    stack_id = Evaluate.evaluate(game, Enum.at(code, 1), trace ++ ["stack_id"])
    dest_group_id = Evaluate.evaluate(game, Enum.at(code, 2), trace ++ ["dest_group_id"])
    dest_stack_index = Evaluate.evaluate(game, Enum.at(code, 3), trace ++ ["dest_stack_index"])
    options = if argc >= 4 do Evaluate.evaluate(game, Enum.at(code, 4), trace ++ ["options"] ) else nil end
    #try do
      GameUI.move_stack(game, stack_id, dest_group_id, dest_stack_index, options)
    #rescue
    #  e ->
    #    raise("Failed to move stack #{stack_id} to dest_group_id:#{dest_group_id} dest_stack_index:#{dest_stack_index}. " <> inspect(e) <> inspect(trace))
    #end
  end


end
