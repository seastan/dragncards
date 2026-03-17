defmodule DragnCardsGame.Evaluate.Functions.LIST_INSERT_AT do
  alias DragnCardsGame.Evaluate
  @moduledoc """
  *Arguments*:
  1. `list` (list)
  2. `index` (integer)
  3. `value` (any)

  Inserts `value` into `list` at `index`. Note that `index` is capped at `list` length. Negative `index` indicates an offset from the end of the `list`.

  *Returns*:
  (list) The updated list.
  """

  @doc """
  Executes the 'LIST_INSERT_AT' operation with the given arguments.

  ## Parameters

    - `args`: The arguments required for the 'LIST_INSERT_AT' operation.

  ## Returns

  The result of the 'LIST_INSERT_AT' operation.
  """
  def execute(game, code, trace) do
    Evaluate.argc(code, 3)
    list = Evaluate.evaluate(game, Enum.at(code, 1), trace ++ ["list"])
    index = Evaluate.evaluate(game, Enum.at(code, 2), trace ++ ["index"])
    value = Evaluate.evaluate(game, Enum.at(code, 3), trace ++ ["value"])
    if !is_list(list) do
      raise "LIST_INSERT_AT: list must be a list"
    end
    if !is_integer(index) do
      raise "LIST_INSERT_AT: index must be an integer"
    end
    List.insert_at(list, index, value)
  end

end
