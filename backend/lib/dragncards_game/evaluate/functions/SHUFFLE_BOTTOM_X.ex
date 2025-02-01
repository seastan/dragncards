defmodule DragnCardsGame.Evaluate.Functions.SHUFFLE_BOTTOM_X do
  alias DragnCardsGame.Evaluate
  @moduledoc """
  *Arguments*:
  1. `groupId` (string)
  2. `x` (integer)

  Shuffles the bottom `x` cards of the group with the given ID.

  *Returns*:
  (game state) The updated game state.
  """

  @doc """
  Executes the 'SHUFFLE_BOTTOM_X' operation with the given arguments.

  ## Parameters

    - `args`: The arguments required for the 'SHUFFLE_BOTTOM_X' operation.

  ## Returns

  The result of the 'SHUFFLE_BOTTOM_X' operation.
  """
  def execute(game, code, trace) do
    group_id = Evaluate.evaluate(game, Enum.at(code, 1), trace ++ ["group_id"])
    x = Evaluate.evaluate(game, Enum.at(code, 2), trace ++ ["x"])
    stack_ids = game["groupById"][group_id]["stackIds"]
    stack_ids_r = Enum.slice(stack_ids, -x, x)
    stack_ids_l = Enum.slice(stack_ids, 0, Enum.count(stack_ids) - x)
    stack_ids_r = stack_ids_r |> Enum.shuffle
    put_in(game, ["groupById", group_id, "stackIds"], stack_ids_l ++ stack_ids_r)
  end


end
