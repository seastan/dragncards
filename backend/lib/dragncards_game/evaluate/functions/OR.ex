defmodule DragnCardsGame.Evaluate.Functions.OR do
  alias DragnCardsGame.Evaluate
  @moduledoc """
  *Arguments*:
  Any number of boolean values

  Returns true if any of the values are true, false otherwise.

  *Returns*:
  (boolean) The result of the OR operation.

  *Examples*:

  Check if the value of the variable `X` is true or the value of the variable `Y` is true:
  ```
  ["OR", "$X", "$Y"]
  ```
  Check if the value of the variable `X` is true or the value of the variable `Y` is true or the value of the variable `Z` is true:
  ```
  ["OR", "$X", "$Y", "$Z"]
  ```
  """

  @doc """
  Executes the 'OR' operation with the given arguments.

  ## Parameters

    - `args`: The arguments required for the 'OR' operation.

  ## Returns

  The result of the 'OR' operation.
  """
  def execute(game, code, trace) do
    statements = Enum.slice(code, 1, Enum.count(code) - 1)
    Enum.any?(Enum.with_index(statements), fn {statement, index} ->
      Evaluate.evaluate(game, statement, trace ++ ["index #{index}"])
    end)
  end


end
