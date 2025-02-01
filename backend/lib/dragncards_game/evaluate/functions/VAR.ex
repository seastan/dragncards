  defmodule DragnCardsGame.Evaluate.Functions.VAR do
  alias DragnCardsGame.Evaluate
  @moduledoc """
  *Arguments*:
  1. `varName` (string beginning with `$`)
  2. `value` (any)

  Defines a local variable with the given name and value. This variable can only be accessed within the current scope or lower/child scopes.

  *Returns*:
  (game state) The updated game state.

  *Examples*:

  Define a variable `X` with the value 5:
  ```
  ["VAR", "$X", 5]
  ```
  Scoping:
  ```
  [
    ["VAR", "$X", 5],
    [
      ["VAR", "$Y", 10],
      ["LOG", "$X"], // 5
      ["LOG", "$Y"] // 10
    ],
    ["LOG", "$X"], // 5
    ["LOG", "$Y"] // Error: Y is not defined
  ]
  ```
  """

  @doc """
  Executes the 'VAR' operation with the given arguments.

  ## Parameters

    - `args`: The arguments required for the 'VAR' operation.

  ## Returns

  The result of the 'VAR' operation.
  """
  def execute(game, code, trace) do
    # Evaluate the value and assign it to the var name
    var_name = Enum.at(code, 1)
    # if var_name does not start with $, raise an error
    if String.starts_with?(var_name, "$") do
      current_scope_index = game["currentScopeIndex"]
      value = Evaluate.evaluate(game, Enum.at(code, 2), trace ++ ["#{var_name}"])
      put_in(game, ["variables", "#{current_scope_index}", var_name], value)
    else
      raise "Tried to define variable '#{var_name}' but it does not start with $."
    end
  end


end
