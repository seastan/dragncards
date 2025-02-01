defmodule DragnCardsGame.Evaluate.Functions.INSPECT do
  alias DragnCardsGame.Evaluate
  @moduledoc """
  *Arguments*:
  1. `input` (anything)
  2. `hintString` (string, optional)

  Returns best-effort string representation of `input`.

  Recognizes the same types as `TYPE_OF` operation.

  For faces returns their `name`. For cards/cardIds returns the `name` of their `currentFace` (or side A `name`, if `currentFace` is not set). For groups/groupIds returns their `label`. For players/playerIds returns their alias obtained using `GET_ALIAS`. For the game returns its `pluginName` alongside `pluginId` and `pluginVersion`. Lists are enclosed in `()`, their individual elements are also converted using this method and separated using `, `.

  Uses the following labels for default/missing values: `id:null`, `id:true`, `id:false`, `id:face`, `id:card`, `id:group`, `id:player`, `id:plugin`, `id:object`, `id:unknown`.

  `hint` can be used to change the representation returned. `INT` forces the operation to return integer representation of input (see `INSPECT_INT`) as string. `S` returns `"s"` when integer representation of input is different than 1, otherwise an empty string (simple plurals for English language). For cards/cardIds `hint` can be a face designator. If it's valid, then the `name` of that face will be returned instead of the default one.

  *Returns*:
  (string) The result of the operation.
  """

  @doc """
  Executes the 'INSPECT' operation with the given arguments.

  ## Parameters

    - `args`: The arguments required for the 'INSPECT' operation.

  ## Returns

  The result of the 'INSPECT' operation.
  """
  def to_string(game, v, h, trace) do
    cond do
      h == "INT" -> Integer.to_string(DragnCardsGame.Evaluate.Functions.INSPECT_INT.to_int(game, v, trace ++ ["to_int"]))
      h == "S" -> if DragnCardsGame.Evaluate.Functions.INSPECT_INT.to_int(game, v, trace ++ ["to_int"]) == 1 do "" else "s" end
      is_nil(v) -> "id:null"
      is_boolean(v) -> if v === true do "id:true" else "id:false" end
      is_integer(v) -> Integer.to_string(v)
      is_float(v) -> Float.to_string(v)
      is_binary(v) ->
        cardById = Map.get(game, "cardById")
        groupById = Map.get(game, "groupById")
        playerData = Map.get(game, "playerData")
        cond do
          Map.has_key?(cardById, v) -> to_string(game, Map.get(cardById, v), h, trace ++ ["cardById"])
          Map.has_key?(groupById, v) -> to_string(game, Map.get(groupById, v), h, trace ++ ["groupById"])
          Map.has_key?(playerData, v) -> to_string(game, Map.get(playerData, v), h, trace ++ ["playerData"])
          true -> v
        end
      is_list(v) -> "(" <> Enum.join(Enum.map(v, fn vv -> to_string(game, vv, h, trace ++ ["vv"]) end), ", ") <> ")"
      is_map(v) ->
        cond do
          Map.has_key?(v, "imageUrl") -> Map.get(v, "name", "id:face")
          Map.has_key?(v, "sides") ->
            sides = Map.get(v, "sides")
            currentSide = Map.get(v, "currentSide")
            cond do
              h !== nil and is_map(sides) and Map.has_key?(sides, h) -> Map.get(Map.get(sides, h), "name", "id:card")
              is_map(sides) and is_binary(currentSide) and Map.has_key?(sides, currentSide) -> Map.get(Map.get(sides, currentSide), "name", "id:card")
              is_map(sides) and Map.has_key?(sides, "A") -> Map.get(Map.get(sides, "A"), "name", "id:card")
              true -> "id:card"
            end
          Map.has_key?(v, "stackIds") -> Map.get(v, "label", "id:group")
          Map.has_key?(v, "user_id") -> (Evaluate.evaluate(game, ["GET_ALIAS", Map.get(v, "id")], trace ++ ["GET_ALIAS"]) || "id:player")
          Map.has_key?(v, "cardById") -> Map.get(v, "pluginName", "id:plugin") <> " (" <> Integer.to_string(Map.get(v, "pluginId", "0")) <> "." <> Integer.to_string(Map.get(v, "pluginVersion", "0")) <> ")"
          true -> "id:object"
        end
      true -> "id:unknown"
    end
  end

  def execute(game, code, trace) do
    argc = Evaluate.argc(code, 1, 2)
    input = Evaluate.evaluate(game, Enum.at(code, 1), trace ++ ["input"])
    hintString = if argc > 1 do
      Evaluate.evaluate(game, Enum.at(code, 2), trace ++ ["hintString"])
    else
      nil
    end
    if !is_nil(hintString) and !is_binary(hintString) do
      raise "INSPECT: hintString must be a string"
    end
    to_string(game, input, hintString, trace ++ ["to_string"])
  end


end
