defmodule DragnCardsGame.Evaluate.Functions.MOVE_CARD do
  alias DragnCardsGame.{Evaluate, GameUI}
  @moduledoc """
  *Arguments*:
  1. `cardId` (string)
  2. `destGroupId` (string)
  3. `destStackIndex` (number)
  4. `destCardIndex` (number, optional, defaults to 0)
  5. `options` (object, optional)

  Moves the card with the given `cardId` to a new stack inserted at position `destStackIndex` of `destGroupId`. A `stackIndex` of -1 will insert the new stack at the end of the group.

  If `destCardIndex` is provided, the card is inserted at that index within the stack. To attach the card to the back of a stack, set `destCardIndex` to -1. Not that if you are setting this to a value other than 0, you must also provide {"combine": true} in the `options` object, as you are combining this card with an existing stack.

  The `options` object can contain the following optional properties:
  - `combine` (boolean): `"left"|"right"|"top"|"bottom"|"behind"` The card will be combined with the stack at `destStackIndex` instead of inserting a new stack, in the direction specified.
  - `allowFlip` (boolean): If false, the card will ignore the `onCardEnter.currentSide` setting of whatever group it is moving to.

  *Returns*:
  (game state) The game state with the card moved.

  *Examples*:

  Move the active card to the top of its associated discard pile:
  ```
  ["MOVE_CARD", "$ACTIVE_CARD_ID", "$ACTIVE_CARD.discardGroupId", 0]
  ```
  Move the active card to the bottom of its associated deck:
  ```
  ["MOVE_CARD", "$ACTIVE_CARD_ID", "$ACTIVE_CARD.deckGroupId", -1]
  ```
  Move the active card to the rightmost place in your play area (assuming you have groups called "player1PlayArea", "player2PlayArea", etc.)
  ```
  ["MOVE_CARD", "$ACTIVE_CARD_ID", "{{$PLAYER_N}}PlayArea", -1]
  ```
  Attach the active card to the back of the stack at index 0 of the your play area:
  ```
  ["MOVE_CARD", "$ACTIVE_CARD_ID", "{{$PLAYER_N}}PlayArea", 0, -1, {"combine": true}]
  ```
  Move the top of your deck to your play area without flipping it:
  ```
  ["MOVE_CARD", "$GAME.groupById.{{$PLAYER_N}}Deck.parentCardIds.[0]", "{{$PLAYER_N}}PlayArea", -1, 0, {"allowFlip": false}]
  ```

  """


  @doc """
  Executes the 'MOVE_CARD' operation with the given arguments.

  ## Parameters

    - `args`: The arguments required for the 'MOVE_CARD' operation.

  ## Returns

  The result of the 'MOVE_CARD' operation.
  """
  def execute(game, code, trace) do
    argc = Evaluate.argc(code, 3, 5)
    card_id = Evaluate.evaluate(game, Enum.at(code, 1), trace ++ ["card_id"])
    # if card_id is nil or not a string, return game unchanged.
    if is_nil(card_id) or not is_binary(card_id) do
      raise("MOVE_CARD: card_id must be a non-nil string, got #{inspect(card_id)}")
    end
    if card_id do
      dest_group_id = Evaluate.evaluate(game, Enum.at(code, 2), trace ++ ["dest_group_id"])
      dest_stack_index = Evaluate.evaluate(game, Enum.at(code, 3), trace ++ ["dest_stack_index"])
      dest_card_index = if argc >= 4 do Evaluate.evaluate(game, Enum.at(code, 4), trace ++ ["dest_stack_index"]) else 0 end
      options = if argc >= 5 do Evaluate.evaluate(game, Enum.at(code, 5), trace ++ ["options"]) else nil end
      GameUI.move_card(game, card_id, dest_group_id, dest_stack_index, dest_card_index, options)

    else
      game
    end
  end


end
