defmodule DragnCardsGame.Evaluate.Functions.INSPECT_INT do
  alias DragnCardsGame.Evaluate
  @moduledoc """
  *Arguments*:
  1. `input` (anything)

  Returns best-effort integer representation of `input`.

  Recognizes the same types as `TYPE_OF` operation.

  For `null`, `false`, or unknowns returns 0. For `true`, cardIds, playerIds, or objects (except groups) returns 1. For floats returns their rounded and truncated value. For strings tries to interpret them as floats or integers, otherwise returns their length. For groups/groupIds returns the length of their `stackIds` list. For lists returns their length. Integer values are returned as-is.

  *Returns*:
  (integer) The result of the operation.
  """

  @doc """
  Executes the 'INSPECT_INT' operation with the given argument.

  ## Parameters

    - `args`: The argument required for the 'INSPECT_INT' operation.

  ## Returns

  The result of the 'INSPECT_INT' operation.
  """
  def to_int(game, v, trace) do
    cond do
      is_nil(v) -> 0
      is_boolean(v) -> if v === true do 1 else 0 end
      is_integer(v) -> v
      is_float(v) -> trunc(Float.round(v))
      is_binary(v) ->
        cardById = Map.get(game, "cardById")
        groupById = Map.get(game, "groupById")
        playerData = Map.get(game, "playerData")
        cond do
          Map.has_key?(cardById, v) -> 1
          Map.has_key?(groupById, v) -> to_int(game, Map.get(groupById, v), trace ++ ["groupById"])
          Map.has_key?(playerData, v) -> 1
          true ->
            try do
              trunc(Float.round(String.to_float(v)))
            rescue
              _ ->
                try do
                  String.to_integer(v)
                rescue
                  _ -> String.length(v)
                end
            end
        end
      is_list(v) -> Enum.count(v)
      is_map(v) ->
        cond do
          Map.has_key?(v, "stackIds") -> Enum.count(Map.get(v, "stackIds"))
          true -> 1
        end
      true -> 0
    end
  end

  def execute(game, code, trace) do
    Evaluate.argc(code, 1)
    input = Evaluate.evaluate(game, Enum.at(code, 1), trace ++ ["input"])
    to_int(game, input, trace ++ ["to_int"])
  end


end
