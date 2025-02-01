defmodule DragnCardsGame.Evaluate.Functions.WHILE do
  alias DragnCardsGame.Evaluate
  @moduledoc """
  *Arguments*:
  1. `condition` (DragnLang code)
  2. `code` (DragnLang code)

  Executes `code` while `condition` is `true`.

  *Returns*:
  (game state) The updated game state.

  *Examples*:

  Simple counter:
  ```
  [
    ["VAR", "$X", 0],
    ["WHILE",
      ["LESS_THAN", "$X", 5],
      [
        ["LOG", "$X"],
        ["UPDATE_VAR", "$X", ["ADD", "$X", 1]]
      ]
    ]
  ]
  ```

  Define a function "DISCARD_UNTIL", which discards cards from a group until a specific kind of card is on top:
  ```
  [
    ["FUNCTION", "DISCARD_UNTIL", "$GROUP_ID", "$COND", [
      ["VAR", "$CARD_ID", "$GAME.groupById.$GROUP_ID.parentCardIds.[0]"],
      ["VAR", "$CARD", "$GAME.cardById.$CARD_ID"],
      ["WHILE",
        ["AND",
          ["NOT", ["ACTION_LIST", "$COND"]],
          ["GREATER_THAN", ["LENGTH", "$GAME.groupById.$GROUP_ID.stackIds"], 1]
        ],
        [
          ["MOVE_CARD", "$CARD_ID", "$CARD.discardGroupId", 0],
          ["UPDATE_VAR", "$CARD_ID", "$GAME.groupById.$GROUP_ID.parentCardIds.[0]"],
          ["UPDATE_VAR", "$CARD", "$GAME.cardById.$CARD_ID"]
        ]
      ]
    ]]
  ]
  ```
  This function can be used by defining a `$COND` as a pointer to some code:
  ```
    ["VAR", "$COND",
      ["POINTER",
        ["EQUAL", "$CARD.sides.A.type", "Enemy"]
      ]
    ]
  ```
  Then called like this:
  ```
  ["DISCARD_UNTIL", "sharedEncounterDeck", "$COND"]
  ```
  """

  @doc """
  Executes the 'WHILE' operation with the given arguments.

  ## Parameters

    - `args`: The arguments required for the 'WHILE' operation.

  ## Returns

  The result of the 'WHILE' operation.
  """
  def execute(game, code, trace) do
    condition = Enum.at(code, 1)
    action_list = Enum.at(code, 2)
    Evaluate.while_loop(game, condition, action_list, trace, 0)
  end


end
