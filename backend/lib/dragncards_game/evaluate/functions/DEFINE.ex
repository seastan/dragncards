defmodule DragnCardsGame.Evaluate.Functions.DEFINE do
  alias DragnCardsGame.Evaluate
  @moduledoc """
  *Arguments*:
  1. `varName` (string starting with `$`)
  2. `value` (any)

  Defines a global variable with the given name and value. If the variable already exists, it is overwritten. The variable persists across scopes and erased at the end of the backend process.

  *Returns*:
  (game state) The game state with the variable with the given name defined with the given value.
  """

  @doc """
  Executes the 'DEFINE' operation with the given arguments.

  ## Parameters

    - `args`: The arguments required for the 'DEFINE' operation.

  ## Returns

  The result of the 'DEFINE' operation.
  """
  def execute(game, code, trace) do
    # Evaluate the value and assign it to the var name
    var_name = Enum.at(code, 1)
    # if var_name does not start with $, raise an error
    if String.starts_with?(var_name, "$") do
      value = Evaluate.evaluate(game, Enum.at(code, 2), trace ++ ["#{var_name}"])
      put_in(game, ["variables", var_name], value)
    else
      raise "Tried to define variable '#{var_name}' but it does not start with $."
    end
  end


end
