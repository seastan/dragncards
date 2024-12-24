defmodule DragnCardsGame.Evaluate.Functions.FILTER_CARDS do
  alias DragnCardsGame.Evaluate
  @moduledoc """
  *Arguments*:
  1. `varName` (string starting with `$`)
  2. `condition` (DragnLang code)

  Filters the cards in the game by the given condition. `varName` is the name of the variable that will be assigned to each card when `condition` is evaluated.

  *Returns*:
  (list) The cards in the game that match the condition.

  *Example*:
  ```
  [
    ["VAR", "$SELECTED_CARDS",
      ["FILTER_CARDS",
        "$CARD",
        ["AND",
          ["EQUAL", "$CARD.type", "Hero"],
          ["EQUAL", "$CARD.controller", "player1"]
        ]
      ]
    ],
    ["FOR_EACH_VAL", "$SELECTED_CARD", "$SELECTED_CARDS", [
      ["LOG", "{{$ALIAS_N}} targeted {{$SELECTED_CARD.currentFace.name}}."],
      ["SET", "/cardById/{{$SELECTED_CARD.id}}/targeting/$PLAYER_N", true]
    ]]
  ]
  ```

  """

  @doc """
  Executes the 'FILTER_CARDS' operation with the given arguments.

  ## Parameters

    - `args`: The arguments required for the 'FILTER_CARDS' operation.

  ## Returns

  The result of the 'FILTER_CARDS' operation.
  """
  def execute(game, code, trace) do
    var_name = Enum.at(code, 1)
    condition = Enum.at(code, 2)
    all_cards = Enum.filter(Map.values(game["cardById"]), fn(card) ->
      Evaluate.card_match?(game, var_name, card, condition, trace)
    end)
    all_cards
  end


end
