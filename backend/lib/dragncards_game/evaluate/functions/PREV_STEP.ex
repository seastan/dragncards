defmodule DragnCardsGame.Evaluate.Functions.PREV_STEP do
  alias DragnCardsGame.Evaluate
  @moduledoc """
  *Arguments*:
  None

  Moves `$GAME.stepId` backward one step.

  *Returns*:
  (game state) The game state with the step advanced backward by one.
  """

  @doc """
  Executes the 'PREV_STEP' operation with the given arguments.

  ## Parameters

    - `args`: The arguments required for the 'PREV_STEP' operation.

  ## Returns

  The result of the 'PREV_STEP' operation.
  """
  def execute(game, code, trace) do
    prev_step_action_list = [
      ["VAR", "$STEP_ID", "$GAME.stepId"],
      ["VAR", "$OLD_STEP_INDEX", ["GET_INDEX", "$GAME_DEF.stepOrder", "$GAME.stepId"]],
      ["COND",
        ["EQUAL", "$OLD_STEP_INDEX", 0],
        ["DEFINE", "$NEW_STEP_INDEX", ["SUBTRACT", ["LENGTH", "$GAME_DEF.stepOrder"], 1]],
        ["TRUE"],
        ["DEFINE", "$NEW_STEP_INDEX", ["SUBTRACT", "$OLD_STEP_INDEX", 1]]
      ],
      ["VAR", "$STEP_ID", "$GAME_DEF.stepOrder.[$NEW_STEP_INDEX]"],
      ["LOG", "$ALIAS_N", " reverted the round step to ", "$GAME_DEF.steps.$STEP_ID.label", "."],
      ["SET", "/stepId", "$STEP_ID"]
    ]
    Evaluate.evaluate(game, prev_step_action_list, trace ++ ["prev_step_action_list"])
  end


end
