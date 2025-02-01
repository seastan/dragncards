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
    player_i = Evaluate.evaluate(game, Enum.at(code, 1), trace ++ ["player_i"])
    Evaluate.evaluate(game, [["VAR", "$PLAYER_N", player_i], "$ALIAS_N"], trace ++ ["$ALIAS_N"])
  end


end
