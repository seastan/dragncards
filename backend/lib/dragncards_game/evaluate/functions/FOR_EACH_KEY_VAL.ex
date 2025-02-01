defmodule DragnCardsGame.Evaluate.Functions.FOR_EACH_KEY_VAL do
  alias DragnCardsGame.Evaluate
  @moduledoc """
  *Arguments*:
  1. `keyName` (string starting with $)
  2. `valName` (string starting with $)
  3. `obj` (object)
  4. `function` (actionList)

  Iterates over the key-value pairs of an object, assigning the key to `keyName` and the value to `valName`.

  *Returns*:
  (any) The result of the successive calling of the function on each key-value pair.

  *Examples*:

  Log the name of each card in the game:
  ```
  [
    ["FOR_EACH_KEY_VAL", "$CARD_ID", "$CARD", "$GAME.cardById, [
      ["LOG", "{{$CARD_ID}}: {{$CARD.currentFace.name}}"]
    ]
  ]
  ```

  Readies any cards that are rotated 90 degrees:
  ```
  [
    ["FOR_EACH_KEY_VAL", "$CARD_ID", "$CARD", "$GAME.cardById, [
      ["COND",
        ["EQUAL", ["VAR", "$CARD.rotation"], 90],
        [
          ["LOG", "{{$ALIAS_N}} readied {{$CARD.currentFace.name}}."],
          ["SET", "/cardById/{{$CARD_ID}}/rotation", 0]
        ]
      ]
    ]
  ]
  ```

  """

  @doc """
  Executes the 'FOR_EACH_KEY_VAL' operation with the given arguments.

  ## Parameters

    - `args`: The arguments required for the 'FOR_EACH_KEY_VAL' operation.

  ## Returns

  The result of the 'FOR_EACH_KEY_VAL' operation.
  """
  def execute(game, code, trace) do
    Evaluate.argc(code, 4)
    key_name = Enum.at(code, 1)
    val_name = Enum.at(code, 2)
    old_list = Evaluate.evaluate(game, Enum.at(code, 3), trace ++ ["old_list"])
    function = Enum.at(code, 4)
    Enum.reduce(old_list, game, fn({key, val}, acc) ->
      acc = Evaluate.evaluate(acc, ["VAR", key_name, key], trace ++ ["key #{key}"])
      acc = Evaluate.evaluate(acc, ["VAR", val_name, val], trace ++ ["val"])
      Evaluate.evaluate(acc, function, trace ++ ["key #{key}"])
    end)
  end


end
