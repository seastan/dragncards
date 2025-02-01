defmodule DragnCardsGame.Evaluate.Functions.NOT do
  alias DragnCardsGame.Evaluate
  @moduledoc """
  *Arguments*:
  1. `value` (boolean)

  Returns the logical NOT of `value`.

  *Returns*:
  (boolean) The result of the NOT operation.

  *Examples*:

  Check if the value of the variable `X` is not true:
  ```
  ["NOT", "$X"]
  ```
  """

  @doc """
  Executes the 'NOT' operation with the given arguments.

  ## Parameters

    - `args`: The arguments required for the 'NOT' operation.

  ## Returns

  The result of the 'NOT' operation.
  """
  def execute(game, code, trace) do
    !Evaluate.evaluate(game, Enum.at(code,1), trace)
  end


end
