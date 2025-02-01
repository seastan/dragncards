defmodule DragnCardsGame.Evaluate.Functions.SHUFFLE_LIST do
  alias DragnCardsGame.Evaluate
  @moduledoc """
  *Arguments*:
  1. `list` (list)

  Shuffles the given list.

  *Returns*:
  (list) The shuffled list.

  *Examples*:

  Get a random list of players
  ```
  ["SHUFFLE_LIST", ["LIST", "player1", "player2", "player3", "player4"]]
  ```
  Or
  ```
  ["SHUFFLE_LIST", "$PLAYER_ORDER"]
  ```
  """

  @doc """
  Executes the 'SHUFFLE_LIST' operation with the given arguments.

  ## Parameters

    - `args`: The arguments required for the 'SHUFFLE_LIST' operation.

  ## Returns

  The result of the 'SHUFFLE_LIST' operation.
  """
  def execute(game, code, trace) do
    Evaluate.evaluate(game, Enum.at(code, 1), trace ++ ["arg0"]) |> Enum.shuffle
  end


end
