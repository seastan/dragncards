defmodule DragnCardsGame.Evaluate.Functions.SHUFFLE_GROUP do
  alias DragnCardsGame.Evaluate
  @moduledoc """
  *Arguments*:
  1. `groupId` (string)

  Shuffles the cards in the group with the given ID.

  *Returns*:
  (game state) The updated game state.

  *Examples*:

  Shuffle the cards in the group with the ID `player1Deck`:
  ```
  ["SHUFFLE_GROUP", "player1Deck"]
  ```
  """

  @doc """
  Executes the 'SHUFFLE_GROUP' operation with the given arguments.

  ## Parameters

    - `args`: The arguments required for the 'SHUFFLE_GROUP' operation.

  ## Returns

  The result of the 'SHUFFLE_GROUP' operation.
  """
  def execute(game, code, trace) do
    group_id = Evaluate.evaluate(game, Enum.at(code, 1), trace ++ ["group_id"])
    stack_ids = game["groupById"][group_id]["stackIds"]
    shuffled_stack_ids = stack_ids |> Enum.shuffle
    Evaluate.evaluate(game, ["SET", "/groupById/#{group_id}/stackIds", ["LIST"] ++ shuffled_stack_ids], trace)
  end


end
