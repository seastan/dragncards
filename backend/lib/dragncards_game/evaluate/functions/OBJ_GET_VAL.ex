defmodule DragnCardsGame.Evaluate.Functions.OBJ_GET_VAL do
  alias DragnCardsGame.Evaluate
  @moduledoc """
  *Arguments*:
  1. `object` (object)
  2. `key` (string)

  Returns the value of the given `key` in the given `object`.

  This is normally not used due to the convenience of the dot syntax for accessing object properties.

  *Returns*:
  (any) The value of the given key in the object.

  *Examples*:

  If the active card has a rotation on 90, set it to 0:
  ```
  ["COND",
    ["EQUAL", ["OBJ_GET_VAL", "$ACTIVE_CARD", "rotation"], 90],
    [
      ["LOG", "{{$ALIAS_N}} rotated {{$ACTIVE_FACE.name}} back to 0"]
      ["SET", "/cardById/$ACTIVE_CARD_ID/rotation", 0]
    ]
  ]
  ```
  This is equivalent to the dot syntax:
  ```
  ["COND",
    ["EQUAL", "$ACTIVE_CARD.rotation", 90],
    [
      ["LOG", "{{$ALIAS_N}} rotated {{$ACTIVE_FACE.name}} back to 0"]
      ["SET", "/cardById/$ACTIVE_CARD_ID/rotation", 0]
    ]
  ]
  ```
  """

  @doc """
  Executes the 'OBJ_GET_VAL' operation with the given arguments.

  ## Parameters

    - `args`: The arguments required for the 'OBJ_GET_VAL' operation.

  ## Returns

  The result of the 'OBJ_GET_VAL' operation.
  """
  def execute(game, code, trace) do
    map = Evaluate.evaluate(game, Enum.at(code,1), trace ++ ["map"])
    key = Evaluate.evaluate(game, Enum.at(code,2), trace ++ ["key"])
    map[key]
  end


end
