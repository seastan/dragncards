defmodule DragnCardsGame.Evaluate.Functions.SET do
  alias DragnCardsGame.{Evaluate, PutByPath}
  @moduledoc """
  *Arguments*:
  1. `path` (string of keys separated by `/`)
  2. `value` (any)

  Sets the value at the given path in the game state. Triggers an automation that is listening to `path`.

  *Returns*:
  (game state) The updated game state.

  *Examples*:

  Set the value of `player1`'s `hitPoints` to 20:
  ```
  ["SET", "/playerData/player1/hitPoints", 20]
  ```
  Set the number of damage tokens on the active card to 0:
  ```
  ["SET", "/cardById/$ACTIVE_CARD_ID/tokens/damage", 0]
  ```
  Make a facedown active card visible to the player that triggered the action list:
  ```
  ["SET", "/cardById/$ACTIVE_CARD_ID/peeking/$PLAYER_N", true]
  ```


  """

  @doc """
  Executes the 'SET' operation with the given arguments.

  ## Parameters

    - `args`: The arguments required for the 'SET' operation.

  ## Returns

  The result of the 'SET' operation.
  """
  def execute(game, code, trace) do
    path = Evaluate.evaluate(game, Enum.at(code, 1), trace ++ ["path"])
    value = Evaluate.evaluate(game, Enum.at(code, 2), trace ++ ["value"])
    {put_by_path_time, game} = :timer.tc(fn ->
      PutByPath.put_by_path(game, path, value, trace ++ ["put_by_path"])
    end)
    #IO.puts("put_by_path_time: #{put_by_path_time} microseconds #{path}")
    game
  end


end
