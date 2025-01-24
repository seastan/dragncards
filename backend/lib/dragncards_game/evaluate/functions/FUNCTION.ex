defmodule DragnCardsGame.Evaluate.Functions.FUNCTION do
  @moduledoc """
  *Arguments*:
  First argument: function_name (string, all caps)
  Next N arguments: the names of the new function arguments (string starting with $)
  Last argument: code (actionList)

  Defines a new function with the given name, arguments, and code. The function name must be all caps. The new function will persist across backend processes and can be called from any actionList or scope.

  It is recommended that you define all functions in advance in gameDef.functions rather than using this built-in function.

  *Returns*:
  (game state) The game state with the new function defined.

  *Examples*:

  ```
  [
    ["FUNCTION", "MY_FUNCTION", "$ARG1", "$ARG2", [
      ["LOG", "{{$ARG1}} and {{$ARG2}}"]
    ],
    ["MY_FUNCTION", "Hello", "World"]
  ]
  ```
  """

  @doc """
  Executes the 'FUNCTION' operation with the given arguments.

  ## Parameters

    - `args`: The arguments required for the 'FUNCTION' operation.

  ## Returns

  The result of the 'FUNCTION' operation.
  """
  def execute(game, code, _trace) do
    new_func_name = Enum.at(code, 1)
    # if func_name is not all caps, raise an error
    if String.upcase(new_func_name) == new_func_name do
      new_func_args = Enum.slice(code, 2, Enum.count(code) - 3)
      new_func_code = Enum.at(code, -1)
      put_in(game, ["functions", new_func_name], %{"args" => new_func_args, "code" => new_func_code})
    else
      raise "Tried to define function '#{new_func_name}' but it is not all caps."
    end
  end


end
