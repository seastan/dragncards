defmodule DragnCardsGame.Evaluate.Functions.SORT_OBJ_LIST do
  alias DragnCardsGame.Evaluate
  @moduledoc """
  *Arguments*:
  1. `listOfObjects` (list)
  2. `variableName` (string)
  3. `lambdaFunction` (DragnLang code)

  Sorts the given list or objects by the given key in ascending order. To sort in descending order, combine with the `REVERSE_LIST` function.

  As it loops through the objects, it will assign each object to the variable name given in the second argument. This variable can then be used in the lambda function to reference the object.

  The return value of the lambda function should be a value that can be compared with the `<` operator. For example, if you are sorting a list of objects by their `name` property, the lambda function should return the value of the `name` property.

  *Returns*:
  (list) The sorted list of objects.

  *Examples*:

  Sort the cards in player1Deck by their side A `name` property:
  ```
  ["SORT_OBJ_LIST", "$GAME.groupById.player1Deck.parentCards", "$CARD", "$CARD.sides.A.name"]
  ```
  Sort the cards in player1Deck such that all Event type cards are at the end. We have the lambda function return 1 if the card is an Event, and 0 otherwise:
  ```
  ["SORT_OBJ_LIST",
    "$GAME.groupById.player1Deck.parentCards",
    "$CARD",
    ["COND",
      ["EQUAL", "$CARD.sides.A.type", "Event"],
      1,
      ["TRUE"],
      0
    ]
  ]
  ```
  """

  @doc """
  Executes the 'SORT_OBJ_LIST' operation with the given arguments.

  ## Parameters

    - `args`: The arguments required for the 'SORT_OBJ_LIST' operation.

  ## Returns

  The result of the 'SORT_OBJ_LIST' operation.
  """
  def execute(game, code, trace) do
    list_of_objects = Evaluate.evaluate(game, Enum.at(code, 1), trace ++ ["listOfObjects"])
    var_name = Enum.at(code, 2)
    lambda = Enum.at(code, 3)

    Enum.sort_by(list_of_objects, fn obj ->
      game = Evaluate.evaluate(game, ["VAR", var_name, obj], trace ++ ["variableName"])
      Evaluate.evaluate(game, lambda, trace ++ ["lambdaFunction"])
    end)
  end

end
