defmodule DragnCardsGame.Evaluate.Functions.UPDATE_LAYOUT do
  alias DragnCardsGame.Evaluate
  @moduledoc """
  *Arguments*:
  1. `path` (string of keys separated by `/`)
  2. `value` (any)

  Updates the shared layout and each player's layout at the given path to the given value.

  For example, if `path` is `"/layout/regions/sharedMainDeck/groupId"` and the value is `"sharedDeck2"`, it will update the shared layout at `"/layout/regions/sharedMainDeck/groupId"` to `"sharedDeck2"` and each player's layout at `"/playerData/playerI/layout/regions/sharedMainDeck/groupId"` to `"sharedDeck2"`.

  *Returns*:
  (game state) The updated game state.

  *Examples*:

  ```
  ["UPDATE_LAYOUT", "/layout/regions/sharedMainDeck/groupId", "sharedDeck2"]
  ```
  """

  @doc """
  Executes the 'UPDATE_LAYOUT' operation with the given arguments.

  ## Parameters

    - `args`: The arguments required for the 'UPDATE_LAYOUT' operation.

  ## Returns

  The result of the 'UPDATE_LAYOUT' operation.
  """
  def execute(game, code, trace) do
    path = Evaluate.evaluate(game, Enum.at(code, 1), trace ++ ["path"])
    value = Evaluate.evaluate(game, Enum.at(code, 2), trace ++ ["value"])
    game = try do
      shared_path = ["LIST"] ++ path
      Evaluate.evaluate(game, ["SET", shared_path, value], trace ++ ["set shared"])
    rescue
      _ ->
        game
        #Evaluate.evaluate(game, ["LOG", "WARNING: Could not update layout at path: #{path} with value: #{value}"])
    end
    # Loop over key/values in the playerData and update the layout
    Enum.reduce(game["playerData"], game, fn({player_i, _player_data}, acc) ->
      player_path = ["LIST", "playerData", player_i] ++ path
      try do # Not all players' layouts will have the region defined
        Evaluate.evaluate(acc, ["SET", player_path, value], trace ++ ["set player_i"])
      rescue
        _ ->
          acc
      end
    end)
  end


end
