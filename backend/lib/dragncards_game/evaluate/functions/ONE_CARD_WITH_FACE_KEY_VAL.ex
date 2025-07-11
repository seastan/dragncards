defmodule DragnCardsGame.Evaluate.Functions.ONE_CARD_WITH_FACE_KEY_VAL do
  alias DragnCardsGame.Evaluate
  @moduledoc """
  *Arguments*:
  1. `key` (string)
  2. `val` (any)
  3. `side` (string, optional, default: "A")

  Searches through the cards in an arbitrary order and returns the first card it finds where the card's ["sides"][side][key] == val. This is more heavily optimized compared to the `ONE_CARD` function.

  If no card is found that matches the condition, this function will return `null`.

  *Returns*:
  (object) The first card that matches the name.

  *Examples*:

  Find a card in the game that has the name "Queen" on its "A" side:
  ```
  ["ONE_CARD_WITH_FACE_KEY_VAL", "name", "Queen"]
  ```

  """

  @doc """
  Executes the 'ONE_CARD_WITH_FACE_KEY_VAL' operation with the given arguments.

  ## Parameters

    - `args`: The arguments required for the 'ONE_CARD_WITH_FACE_KEY_VAL' operation.

  ## Returns

  The result of the 'ONE_CARD_WITH_FACE_KEY_VAL' operation.
  """
  def execute(game, code, trace) do
    argc = Evaluate.argc(code, 2, 3)
    key = Evaluate.evaluate(game, Enum.at(code, 1), trace ++ ["name"])
    val = Evaluate.evaluate(game, Enum.at(code, 2), trace ++ ["val"])
    side = if argc == 3 do
      Evaluate.evaluate(game, Enum.at(code, 3), trace ++ ["side"])
    else
      "A"
    end
    one_card = Enum.find(Map.values(game["cardById"]), fn(card) ->
      card["sides"][side][key] == val
    end)
    one_card
  end


end
