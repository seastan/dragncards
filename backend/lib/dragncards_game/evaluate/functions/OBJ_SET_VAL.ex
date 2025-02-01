defmodule DragnCardsGame.Evaluate.Functions.OBJ_SET_VAL do
  alias DragnCardsGame.Evaluate
  @moduledoc """
  *Arguments*:
  1. `object` (object)
  2. `key` (string)
  3. `value` (any)

  Sets the value of the given `key` in the given `object` to `value`.

  This function is not often used, because setting an object's value in this way will not update that object in the game state. It is only useful for updating the value of a temporary object.

  *Returns*:
  (object) The object with the value set.

  *Examples*:

  The following will ***not*** have the intended effect. It will return the active card object with the rotation modified. It will not return an updated game state with the card's rotation modified.
  ```
  ["OBJ_SET_VAL", "$ACTIVE_CARD", "rotation", 90]
  ```
  To update a card's property and return the new game state you must use the `SET`, `INCREASE_VAL`, or `DECREASE_VAL` operations:
  ```
  ["SET", "/cardById/$ACTIVE_CARD_ID/rotation", 90]
  ```


  """

  @doc """
  Executes the 'OBJ_SET_VAL' operation with the given arguments.

  ## Parameters

    - `args`: The arguments required for the 'OBJ_SET_VAL' operation.

  ## Returns

  The result of the 'OBJ_SET_VAL' operation.
  """
  def execute(game, code, trace) do
    case Enum.count(code) do
      4 ->
        obj = Evaluate.evaluate(game, Enum.at(code,1), trace ++ ["obj"])
        key = Evaluate.evaluate(game, Enum.at(code,2), trace ++ ["key"])
        value = Evaluate.evaluate(game, Enum.at(code,3), trace ++ ["value"])
        put_in(obj[key], value)
      5 ->
        obj = Evaluate.evaluate(game, Enum.at(code,1), trace ++ ["obj"])
        path = Evaluate.evaluate(game, Enum.at(code,2), trace ++ ["path"])
        key = Evaluate.evaluate(game, Enum.at(code,3), trace ++ ["key"])
        value = Evaluate.evaluate(game, Enum.at(code,4), trace ++ ["value"])
        put_in(obj, path ++ [key], value)
    end
  end


end
