defmodule DragnCardsGame.Evaluate.Functions.NEXT_STEP do
  alias DragnCardsGame.Evaluate
  @moduledoc """
  *Arguments*:
  None

  Advances `$GAME.stepId` by one step.

  *Returns*:
  (game state) The game state with the step advanced by one.
  """

  @doc """
  Executes the 'NEXT_STEP' operation with the given arguments.

  ## Parameters

    - `args`: The arguments required for the 'NEXT_STEP' operation.

  ## Returns

  The result of the 'NEXT_STEP' operation.
  """
  def execute(game, code, trace) do
    next_step_action_list = [
      ["VAR", "$STEP_ID", "$GAME.stepId"],
      ["VAR", "$OLD_STEP_INDEX", ["GET_INDEX", "$GAME.stepOrder", "$GAME.stepId"]],
      ["COND",
        ["EQUAL", "$OLD_STEP_INDEX", ["SUBTRACT", ["LENGTH", "$GAME.stepOrder"], 1]],
        ["DEFINE", "$NEW_STEP_INDEX", 0],
        ["TRUE"],
        ["DEFINE", "$NEW_STEP_INDEX", ["ADD", "$OLD_STEP_INDEX", 1]]
      ],
      ["COND",
        ["EQUAL", "$NEW_STEP_INDEX", 0],
        [
          ["LOG", "{{$ALIAS_N}} increased the round number by 1."],
          ["INCREASE_VAL", "/roundNumber", 1]
        ]
      ],
      ["VAR", "$STEP_ID", "$GAME.stepOrder.[$NEW_STEP_INDEX]"],
      ["LOG", "$ALIAS_N", " advanced the round step to ", "$GAME.steps.$STEP_ID.label", "."],
      ["SET", "/stepId", "$STEP_ID"]
    ]
    Evaluate.evaluate(game, next_step_action_list, trace ++ ["next_step_action_list"])
  end


end
