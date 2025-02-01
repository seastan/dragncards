defmodule DragnCardsGame.Evaluate.Functions.UPDATE_VAR do
  alias DragnCardsGame.Evaluate
  @moduledoc """
  *Arguments*:
  1. `varName` (string beginning with `$`)
  2. `value` (any)

  Updates the value of the variable with the given name.

  *Returns*:
  (game state) The updated game state.

  *Examples*:

  Update the value of the variable `X` to 5:
  ```
  [
    ["VAR", "$X", 5],
    ["LOG", "$X"], // 5
    ["UPDATE_VAR", "$X", 10],
    ["LOG", "$X"] // 10
  ]
  ```
  You also overwrite the variable with a new `VAR` operation. This works when at the same or lower/child scope, but if you want to update a variable in a higher/parent scope, you need to use `UPDATE_VAR`.
  ```
  [
    ["VAR", "$X", 5],
    ["LOG", "$X"], // 5
    [
      ["VAR", "$X", 10],
      ["LOG", "$X"] // 10
    ]],
    ["LOG", "$X"], // 5
    [
      ["UPDATE_VAR", "$X", 10],
      ["LOG", "$X"] // 10
    ],
    ["LOG", "$X"] // 10
  ]
  ```

  """

  @doc """
  Executes the 'UPDATE_VAR' operation with the given arguments.

  ## Parameters

    - `args`: The arguments required for the 'UPDATE_VAR' operation.

  ## Returns

  The result of the 'UPDATE_VAR' operation.
  """
  def execute(game, code, trace) do
    # Evaluate the value and assign it to the var name
    var_name = Enum.at(code, 1)
    # if var_name does not start with $, raise an error
    if String.starts_with?(var_name, "$") do
      current_scope_index = game["currentScopeIndex"]
      var_scope_index = Evaluate.find_var_scope_index(var_name, current_scope_index, game["variables"])
      value = Evaluate.evaluate(game, Enum.at(code, 2), trace ++ ["#{var_name}"])
      put_in(game, ["variables", "#{var_scope_index}", var_name], value)
    else
      raise "Tried to update variable '#{var_name}' but it does not start with $."
    end
  end


end
