defmodule DragnCardsGame.Evaluate.Functions.APPEND do
  alias DragnCardsGame.Evaluate
  @moduledoc """
  *Arguments*:
  1. `list1` (list)
  2. `val` (any)

  Appends `val` to `list1`. If the first list is null, it is treated as an empty list.

  *Returns*:
  (list) The result of the append operation.
  """

  @doc """
  Executes the 'APPEND' operation with the given arguments.

  ## Parameters

    - `args`: The arguments required for the 'APPEND' operation.

  ## Returns

  The result of the 'APPEND' operation.
  """
  def execute(game, code, trace) do
    list = Evaluate.evaluate(game, Evaluate.arg(code, 1), ["left" | trace]) || []
    list ++ [Evaluate.evaluate(game, Evaluate.arg(code, 2), ["right" | trace])]
  end


end
