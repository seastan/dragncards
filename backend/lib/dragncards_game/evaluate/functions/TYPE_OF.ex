defmodule DragnCardsGame.Evaluate.Functions.TYPE_OF do
  alias DragnCardsGame.Evaluate
  @moduledoc """
  *Arguments*:
  1. `input` (anything)

  Returns the type of `input`.

  *Returns*:
  (string) Type of `input` as string, one of: `null`, `boolean`, `integer`, `float`, `cardId`, `groupId`, `playerId`, `string`, `list`, `face`, `card`, `group`, `player`, `game`, `object`, `unknown`.
  """

  @doc """
  Executes the 'TYPE_OF' operation with the given argument.

  ## Parameters

    - `args`: The argument required for the 'TYPE_OF' operation.

  ## Returns

  The result of the 'TYPE_OF' operation.
  """
  def execute(game, code, trace) do
    Evaluate.argc(code, 1)
    input = Evaluate.evaluate(game, Enum.at(code, 1), trace ++ ["input"])
    cond do
      is_nil(input) -> "null"
      is_boolean(input) -> "boolean"
      is_integer(input) -> "integer"
      is_float(input) -> "float"
      is_binary(input) ->
        cardById = Map.get(game, "cardById")
        groupById = Map.get(game, "groupById")
        playerData = Map.get(game, "playerData")
        cond do
          Map.has_key?(cardById, input) -> "cardId"
          Map.has_key?(groupById, input) -> "groupId"
          Map.has_key?(playerData, input) -> "playerId"
          true -> "string"
        end
      is_list(input) -> "list"
      is_map(input) ->
        cond do
          Map.has_key?(input, "imageUrl") -> "face"
          Map.has_key?(input, "sides") -> "card"
          Map.has_key?(input, "stackIds") -> "group"
          Map.has_key?(input, "user_id") -> "player"
          Map.has_key?(input, "cardById") -> "game"
          true -> "object"
        end
      true -> "unknown"
    end
  end


end
