defmodule DragnCardsGame.Evaluate.Functions.CONCAT_LISTS do
  alias DragnCardsGame.Evaluate
  @moduledoc """
  *Arguments*:
  1. `list1` (list)
  2. `list2` (list)

  Concatenates `list1` and `list2`. If a list is null, it is treated as an empty list.

  *Returns*:
  (list) The result of the CONCAT_LISTS operation.
  """

  @doc """
  Executes the 'CONCAT_LISTS' operation with the given arguments.

  ## Parameters

    - `args`: The arguments required for the 'CONCAT_LISTS' operation.

  ## Returns

  The result of the 'CONCAT_LISTS' operation.
  """
  def execute(game, code, trace) do
    list1 = Evaluate.evaluate(game, Evaluate.arg(code, 1), ["left" | trace]) || []
    list2 = Evaluate.evaluate(game, Evaluate.arg(code, 2), ["right" | trace]) || []
    list1 ++ list2
  end


end
