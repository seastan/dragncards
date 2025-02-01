defmodule DragnCardsGame.Evaluate.Functions.JOIN_LIST do
  alias DragnCardsGame.Evaluate
  @moduledoc """
  *Arguments*:
  1. `inputList` (list)
  2. `separatorString` (string)

  Joins the given inputList into a string using separatorString as a separator.

  *Returns*:
  (string) The result of the operation.
  """

  @doc """
  Executes the 'JOIN_LIST' operation with the given arguments.

  ## Parameters

    - `args`: The arguments required for the 'JOIN_LIST' operation.

  ## Returns

  The result of the 'JOIN_LIST' operation.
  """
  def execute(game, code, trace) do
    Evaluate.argc(code, 2)
    inputList = Evaluate.evaluate(game, Enum.at(code, 1), trace ++ ["inputList"])
    separatorString = Evaluate.evaluate(game, Enum.at(code, 2), trace ++ ["separatorString"])
    if !is_list(inputList) do
      raise "JOIN_LIST: inputList must be a list"
    end
    if !is_binary(separatorString) do
      raise "JOIN_LIST: separatorString must be a string"
    end
    Enum.join(inputList, separatorString)
  end


end
