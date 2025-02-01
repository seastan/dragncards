defmodule DragnCardsGame.Evaluate.Functions.UNSET do
  alias DragnCardsGame.Evaluate
  @moduledoc """
  *Arguments*:
  1. `path` (string of keys separated by `/`)

  Removes the key and is associated value at the given path in the game state. Does not trigger any automations.

  *Returns*:
  (game state) The updated game state.

  *Examples*:

  ```
  [
    ["SET", "/playerData/player1/hitPoints", 20],
    ["LOG", ["EQUAL", "$GAME.playerData.player1.hitPoints", 20]], // true
    ["UNSET", "/playerData/player1/hitPoints"],
    ["LOG", ["EQUAL", "$GAME.playerData.player1.hitPoints", null]] // true
  ]
  ```

  """

  @doc """
  Executes the 'UNSET' operation with the given arguments.

  ## Parameters

    - `args`: The arguments required for the 'UNSET' operation.

  ## Returns

  The result of the 'UNSET' operation.
  """
  def execute(game, code, trace) do
    path = Evaluate.evaluate(game, Enum.at(code, 1), trace ++ ["path"])
    path_minus_key = Enum.slice(path, 0, Enum.count(path)-1)
    key_to_delete = Enum.at(path, -1)
    nested_map = get_in(game, path_minus_key)
    nested_map = Map.delete(nested_map, key_to_delete)
    put_in(game, path_minus_key, nested_map)
  end


end
