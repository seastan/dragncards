defmodule DragnCardsGame.Evaluate.Functions.LIST_DELETE_AT do
  alias DragnCardsGame.Evaluate
  @moduledoc """
  *Arguments*:
  1. `list` (list)
  2. `index` (integer)

  Removes value at `index` in `list`. Negative `index` indicates an offset from the end of the `list`. If `index` is out of bounds, the original `list` is returned.

  *Returns*:
  (list) The updated list.
  """

  @doc """
  Executes the 'LIST_DELETE_AT' operation with the given arguments.

  ## Parameters

    - `args`: The arguments required for the 'LIST_DELETE_AT' operation.

  ## Returns

  The result of the 'LIST_DELETE_AT' operation.
  """
  def execute(game, code, trace) do
    Evaluate.argc(code, 2)
    list = Evaluate.evaluate(game, Enum.at(code, 1), trace ++ ["list"])
    index = Evaluate.evaluate(game, Enum.at(code, 2), trace ++ ["index"])
    if !is_list(list) do
      raise "LIST_DELETE_AT: list must be a list"
    end
    if !is_integer(index) do
      raise "LIST_DELETE_AT: index must be an integer"
    end
    List.delete_at(list, index)
  end

end
