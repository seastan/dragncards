defmodule DragnCardsGame.Evaluate.Functions.CHOOSE_N do
  alias DragnCardsGame.Evaluate
  @moduledoc """
  *Arguments*:
  1. `list` (list)
  2. `n` (integer)

  Returns a random selection of `n` elements of `list`, without replacement. If `n` is greater than the length of `list`, it returns the entire list in a random order.

  *Returns*:
  (list) The random sublist.
  """

  @doc """
  Executes the 'CHOOSE_N' operation with the given arguments.

  ## Parameters

    - `args`: The arguments required for the 'CHOOSE_N' operation.

  ## Returns

  The result of the 'CHOOSE_N' operation.
  """
  def execute(game, code, trace) do
    list = Evaluate.evaluate(game, Enum.at(code,1), trace ++ ["list"])
    n = Evaluate.evaluate(game, Enum.at(code,2), trace ++ ["n"])
    Enum.take(Enum.shuffle(list), n)
  end


end
