defmodule DragnCardsGame.Evaluate.Functions.DEFINED do
  alias DragnCardsGame.Evaluate
  @moduledoc """
  *Arguments*:
  1. `varName` (string starting with `$`)

  Returns `true` if the variable with the given name is defined, `false` otherwise. If the variable's value is `null` it is considered undefined.

  *Returns*:
  (boolean) The result of the check.
  """

  @doc """
  Executes the 'DEFINED' operation with the given arguments.

  ## Parameters

    - `args`: The arguments required for the 'DEFINED' operation.

  ## Returns

  The result of the 'DEFINED' operation.
  """
  def execute(game, code, trace) do
    var_name = Enum.at(code, 1)
    try do
      result = Evaluate.evaluate_inner(game, var_name, trace ++ ["#{var_name}"])
      result != nil
    rescue
      _ -> false
    end
  end


end
