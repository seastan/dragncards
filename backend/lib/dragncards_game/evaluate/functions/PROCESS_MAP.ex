defmodule DragnCardsGame.Evaluate.Functions.PROCESS_MAP do
  alias DragnCardsGame.Evaluate
  @moduledoc """
  *Arguments*:
  1. `object` (object)

  Normally, when DragnLang evaluates an object, it returns that raw object. This function will return an object where each value has been processed as if it were DragnLang code.

  *Returns*:
  (object) The processed object.

  *Examples*:

  ```
  [
    ["VAR", "$B", 2],
    ["VAR", "$OBJ1", {"a": 1, "b": "$B"}],
    ["LOG", "$OBJ1"], // {"a": 1, "b": "$B"}
    ["LOG", ["PROCESS_MAP", "$OBJ1"]] // {"a": 1, "b": 2}
  ]
  ```

  """

  @doc """
  Executes the 'PROCESS_MAP' operation with the given arguments.

  ## Parameters

    - `args`: The arguments required for the 'PROCESS_MAP' operation.

  ## Returns

  The result of the 'PROCESS_MAP' operation.
  """
  def execute(game, code, trace) do

    Evaluate.evaluate(game, Evaluate.arg(code, 1), ["map" | trace])
    |> Enum.reduce(%{}, fn({k, v}, acc) ->
      k = Evaluate.evaluate(game, k, ["key" | trace])
      v = Evaluate.evaluate(game, v, ["value" | trace])
      put_in(acc, [k], v)
    end)
  end


end
