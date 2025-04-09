defmodule DragnCardsGame.Evaluate.Functions.MOVE_STACK do
  alias DragnCardsGame.{Evaluate, GameUI, PluginCache}
  alias DragnCards.Plugins
  @moduledoc """
  *Arguments*:
  1. `stackId` (string)
  2. `destGroupId` (string)
  3. `destStackIndex` (number)
  4. `options` (object) (optional)

  Takes the stack with the given `stackId` and inserts it into the group with the given `destGroupId` at stack index `destStackIndex`.

  If `destStackIndex` is -1, the stack will be inserted at the end of the group.

  See `MOVE_CARD` for details on the `options` object.

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
  def get_dest_stack_id(game, options, orig_stack_id, dest_group_id, dest_stack_index) do
    if options && options["combine"] != nil do
      dest_stack = GameUI.get_stack_by_index(game, dest_group_id, dest_stack_index)
      if dest_stack == nil do
        raise("Could not find stack at dest_group_id:#{dest_group_id} dest_stack_index:#{dest_stack_index}")
      end
      dest_stack["id"]
    else
      orig_stack_id
    end
  end

  def get_parent_card(game, dest_stack_id) do
    if dest_stack_id do
      GameUI.get_parent_card_by_stack_id(game, dest_stack_id)
    else
      nil
    end
  end

  def execute(game, code, trace) do
    argc = Evaluate.argc(code, 3, 4)
    stack_id = Evaluate.evaluate(game, Enum.at(code, 1), trace ++ ["stack_id"])
    dest_group_id = Evaluate.evaluate(game, Enum.at(code, 2), trace ++ ["dest_group_id"])
    dest_stack_index = Evaluate.evaluate(game, Enum.at(code, 3), trace ++ ["dest_stack_index"])
    options = if argc >= 4 do Evaluate.evaluate(game, Enum.at(code, 4), trace ++ ["options"] ) else nil end

    # Save variables for postMoveStackActionList
    orig_group_id = GameUI.get_group_by_stack_id(game, stack_id)["id"]
    orig_parent_card_id = get_parent_card(game, stack_id)["id"]

    #try do
    game = GameUI.move_stack(game, stack_id, dest_group_id, dest_stack_index, options)

    # Run postMoveStackActionList if it exists
    post_move_stack_action_list = game["automationActionLists"]["postMoveStackActionList"]
    game = if post_move_stack_action_list do
      if game["automationEnabled"] == false do
        Evaluate.evaluate(game, ["LOG_DEV", "Skipping automation action list postMoveStackActionList because automation is disabled."], trace)
      else
        dest_stack_id = get_dest_stack_id(game, options, stack_id, dest_group_id, dest_stack_index)
        orig_parent_card = GameUI.get_card(game, orig_parent_card_id)
        Evaluate.evaluate(game, [
          ["MULTI_VAR",
            "$ORIG_STACK_ID", stack_id,
            "$ORIG_GROUP_ID", dest_group_id,
            "$ORIG_PARENT_CARD", orig_parent_card,
            "$DEST_STACK_ID", dest_stack_id,
            "$DEST_GROUP_ID", dest_group_id,
            "$DEST_PARENT_CARD", get_parent_card(game, dest_stack_id)
          ],
          post_move_stack_action_list
        ], trace ++ ["game postLoadActionList"])
      end
    else
      game
    end
    #rescue
    #  e ->
    #    raise("Failed to move stack #{stack_id} to dest_group_id:#{dest_group_id} dest_stack_index:#{dest_stack_index}. " <> inspect(e) <> inspect(trace))
    #end
  end


end
