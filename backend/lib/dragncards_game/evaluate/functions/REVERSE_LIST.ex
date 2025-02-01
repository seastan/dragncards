defmodule DragnCardsGame.Evaluate.Functions.REVERSE_LIST do
  alias DragnCardsGame.Evaluate
  @moduledoc """
  *Arguments*:
  1. `list` (list)

  Reverses a list.

  *Returns*:
  (list) The reversed list.

  *Examples*:

  ```
  ["REVERSE_LIST", ["LIST", "player1", "player2", "player3", "player4"]]
  ```
  Or
  ```
  ["REVERSE_LIST", "$PLAYER_ORDER"]
  ```

  """

  @doc """
  Executes the 'REVERSE_LIST' operation with the given arguments.

  ## Parameters

    - `args`: The arguments required for the 'REVERSE_LIST' operation.

  ## Returns

  The result of the 'REVERSE_LIST' operation.
  """
  def execute(game, code, trace) do
    list = Evaluate.evaluate(game, Enum.at(code, 1), trace ++ ["list"])
    Enum.reverse(list)
  end

end
