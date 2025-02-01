defmodule DragnCardsGame.Evaluate.Functions.GET do
  alias DragnCardsGame.Evaluate
  @moduledoc """
  *Arguments*:
  1. `keyList` (list)

  Returns the value at the given `keyList` in the game state. Not commonly used due to the more convenient dot syntax.

  *Returns*:
  (any) The value.

  *Examples*:
  ```
  ["GET", ["cardById", "$ACTIVE_CARD_ID", "controller"]]
  ```
  This is equivalent to:
  ```
  "$GAME.cardById.$ACTIVE_CARD_ID.controller"
  ```
  """

  @doc """
  Executes the 'GET' operation with the given arguments.

  ## Parameters

    - `args`: The arguments required for the 'GET' operation.

  ## Returns

  The result of the 'GET' operation.
  """
  def execute(game, code, trace) do
    path = Evaluate.evaluate(game, Enum.at(code,1), trace ++ ["path"])
    get_in(game, path)
  end


end
