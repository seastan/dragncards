defmodule DragnCardsGame.Evaluate.Functions.GET_ALIAS do
  alias DragnCardsGame.Evaluate
  @moduledoc """
  *Arguments*:
  1. `playerI` (a string such as "player1" or "player2")

  *Returns*:
  (string) The alias corresponding to `playerI`.

  """

  @doc """
  Executes the 'GET_ALIAS' operation with the given arguments.

  ## Parameters

    - `args`: The arguments required for the 'GET_ALIAS' operation.

  ## Returns

  The result of the 'GET_ALIAS' operation.
  """
  def execute(game, code, trace) do
    player_i = Evaluate.evaluate(game, Evaluate.arg(code, 1), ["player_i" | trace])
    Evaluate.evaluate(game, [["VAR", "$PLAYER_N", player_i], "$ALIAS_N"], ["$ALIAS_N" | trace])
  end


end
