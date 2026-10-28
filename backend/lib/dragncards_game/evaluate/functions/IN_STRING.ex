defmodule DragnCardsGame.Evaluate.Functions.IN_STRING do
  alias DragnCardsGame.Evaluate
  @moduledoc """
  *Arguments*:
  1. `container` (string)
  2. `containee` (string)

  *Returns*:
  (boolean) `true` if `containee` is a substring of `container`, `false` otherwise. If `container == containee`, it returns `true`.
  """

  @doc """
  Executes the 'IN_STRING' operation with the given arguments.

  ## Parameters

    - `args`: The arguments required for the 'IN_STRING' operation.

  ## Returns

  The result of the 'IN_STRING' operation.
  """
  def execute(game, code, trace) do
    container = Evaluate.evaluate(game, Evaluate.arg(code, 1), ["container" | trace])
    containee = Evaluate.evaluate(game, Evaluate.arg(code, 2), ["containee" | trace])
    if container == nil or containee == nil do
      false
    else
      String.contains?(container, containee)
    end
  end


end
