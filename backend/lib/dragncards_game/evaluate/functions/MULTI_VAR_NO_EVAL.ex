  defmodule DragnCardsGame.Evaluate.Functions.MULTI_VAR_NO_EVAL do
  alias DragnCardsGame.Evaluate
  @moduledoc """
  *Arguments*:
  Any number of pairs of variable names and values

  Defines a the local variables with the given names and values. This variable can only be accessed within the current scope or lower/child scopes. The values are not evaluated prior to assignment.

  *Returns*:
  (game state) The updated game state.

  *Examples*:

  Define a variable `X` with the value 5 and `Y` with the value 10:
  ```
  ["VAR", "$X", 5, "$Y", 10]
  ```
  ```
  [
    ["VAR", "$X", 5],
    ["MULTI_VAR_NO_EVAL", "$X", 10, "$Y", "$X"] // This will define X as 10 and Y as '$X'
    ["LOG", "$X"], // Logs 10
    ["LOG", "$Y"] // Logs '$X'
  ]
  ```

  """

  @doc """
  Executes the 'MULTI_VAR_NO_EVAL' operation with the given arguments.

  ## Parameters

    - `args`: The arguments required for the 'MULTI_VAR_NO_EVAL' operation.

  ## Returns

  The result of the 'MULTI_VAR_NO_EVAL' operation.
  """
  def execute(game, code, trace) do
    # var_names are at index 1, 3, 5, ...
    var_names = code |> Enum.drop(1) |> Enum.take_every(2)
    var_values_unprocessed = code |> Enum.drop(2) |> Enum.take_every(2)

    if length(var_names) != length(var_values_unprocessed) do
      raise "MULTI_VAR_NO_EVAL: Number of variable names and values do not match."
    end

    current_scope_index = game["currentScopeIndex"]
    game = Enum.zip(var_names, var_values_unprocessed) |> Enum.reduce(game, fn {var_name, value}, acc ->
      if String.starts_with?(var_name, "$") do
        put_in(acc, ["variables", "#{current_scope_index}", var_name], value)
      else
        raise "MULTI_VAR_NO_EVAL: Tried to define variable '#{var_name}' but it does not start with $."
      end
    end)
    game
  end

end
