defmodule DragnCardsGame.Evaluate.Functions.PREV do
  alias DragnCardsGame.Evaluate
  @moduledoc """
  *Arguments*:
  None

  Returns the game state before the current game state. This function can only be used in `gameDef.automation`, and is used to see whether a value being `SET` has changed.

  *Returns*:
  (object) The game state before the current game state.

  *Examples*:

  In `gameDef.automation`:
  ```
  {
    "_comment": "Recompute the threat in the staging area when a card is flipped",
    "type": "trigger",
    "listenTo": ["/cardById/*/currentSide"],
    "condition": ["AND",
                    ["EQUAL", "$TARGET.groupId", "sharedStagingArea"],
                    ["NOT_EQUAL", "$TARGET.currentSide", ["PREV", "$TARGET.currentSide"]]
                ],
    "then": ["COMPUTE_STAGING_THREAT"]
  }
  ```
  """

  @doc """
  Executes the 'PREV' operation with the given arguments.

  ## Parameters

    - `args`: The arguments required for the 'PREV' operation.

  ## Returns

  The result of the 'PREV' operation.
  """
  def execute(game, code, trace) do
    prev_game = game["prev_game"]
    # |> Map.put("variables", game["variables"])
    # |> put_in(["variables", "$TARGET"], game["prev_game"]["variables"]["$TARGET"])
    # |> put_in(["variables", "$TARGET_ID"], game["prev_game"]["variables"]["$TARGET_ID"])
    # |> put_in(["variables", "$TARGET"], game["prev_game"]["variables"]["$TARGET"])
    # |> put_in(["variables", "$THIS"], game["prev_game"]["variables"]["$THIS"])
    # |> put_in(["variables", "$THIS_ID"], game["prev_game"]["variables"]["$THIS_ID"])
    Evaluate.evaluate(prev_game, Enum.at(code, 1), trace)
  end


end
