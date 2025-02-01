defmodule DragnCardsGame.Evaluate.Functions.GROUP_EMPTY do
  alias DragnCardsGame.Evaluate
  @moduledoc """
  *Arguments*:
  1. `groupId` (string)

  *Returns*:
  (boolean) True if the group is empty, false otherwise.

  """

  @doc """
  Executes the 'GROUP_EMPTY' operation with the given arguments.

  ## Parameters

    - `args`: The arguments required for the 'GROUP_EMPTY' operation.

  ## Returns

  The result of the 'GROUP_EMPTY' operation.
  """
  def execute(game, code, trace) do
    group_id = Evaluate.evaluate(game, Enum.at(code, 1), trace)
    cond do
      # If group_id is not in game["groupById"], raise an error.
      not Map.has_key?(game["groupById"], group_id) -> raise("GROUP_EMPTY: Group #{inspect(group_id)} does not exist.")
      true -> Enum.count(game["groupById"][group_id]["stackIds"]) == 0
    end
  end


end
