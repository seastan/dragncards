defmodule DragnCardsGame.Evaluate.Functions.ONE_CARD do
  alias DragnCardsGame.Evaluate
  @moduledoc """
  *Arguments*:
  1. `variableName` (string)
  2. `condition` (DragnLang code)

  Searches through the cards in an arbitrary order and returns the first card it finds that matches the condition. As it loops through the cards, it will assign each card to the variable name given in the first argument. This variable can then be used to reference the card in the condition.

  If no card is found that matches the condition, this function will return `null`.

  *Returns*:
  (object) The first card that matches the condition.

  *Examples*:

  Find a card in the game that has the `"suit": "spades"` and `"value": "Queen"` properties on its side A face:
  ```
  ["ONE_CARD",
    "$CARD",
    ["AND",
      ["EQUAL", "$CARD.sides.A.suit", "spades"],
      ["EQUAL", "$CARD.sides.A.value", "Queen"]
    ]
  ]
  ```

  Find a card in the game that has the `"suit": "spades"` and `"value": "Queen"` face properties, and log whether it is in play or not.
  ```
  [
    ["VAR", "$MATCHED_CARD", ["ONE_CARD",
      "$CARD",
      ["AND",
        ["EQUAL", "$CARD.sides.A.suit", "spades"],
        ["EQUAL", "$CARD.sides.A.value", "Queen"]
      ]
    ]],
    ["COND",
      ["AND",
        ["NOT_EQUAL", "$MATCHED_CARD", null],
        ["EQUAL", "$MATCHED_CARD.inPlay", true]
      ],
      ["LOG", "Found card with suit spades and value Queen in play."],
      ["TRUE"],
      ["LOG", "Did not find card with suit spades and value Queen in play."]
    ]
  ]
  ```
  """

  @doc """
  Executes the 'ONE_CARD' operation with the given arguments.

  ## Parameters

    - `args`: The arguments required for the 'ONE_CARD' operation.

  ## Returns

  The result of the 'ONE_CARD' operation.
  """
  def execute(game, code, trace) do
    var_name = Enum.at(code, 1)
    condition = Enum.at(code, 2)
    one_card = Enum.find(Map.values(game["cardById"]), fn(card) ->
      Evaluate.card_match?(game, var_name, card, condition, trace)
    end)
    one_card
  end


end
