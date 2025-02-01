defmodule DragnCardsGame.Evaluate.Functions.NEXT_STEP do
  alias DragnCardsGame.{Evaluate, TempTokens, PluginCache}
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
    game_old = game
    game_def = PluginCache.get_game_def_cached(game["options"]["pluginId"])
    next_step_action_list = [
      # ["COND",
      #   ["EQUAL", "$GAME.roundNumber", 0],
      #   [
      #     ["LOG", "{{$ALIAS_N}} increased the round number by 1."],
      #     ["INCREASE_VAL", "/roundNumber", 1]
      #   ]
      # ],
      ["VAR", "$STEP_ID", "$GAME.stepId"],
      ["VAR", "$OLD_STEP_INDEX", ["GET_INDEX", "$GAME_DEF.stepOrder", "$GAME.stepId"]],
      ["COND",
        ["EQUAL", "$OLD_STEP_INDEX", ["SUBTRACT", ["LENGTH", "$GAME_DEF.stepOrder"], 1]],
        ["DEFINE", "$NEW_STEP_INDEX", 0],
        ["TRUE"],
        ["DEFINE", "$NEW_STEP_INDEX", ["ADD", "$OLD_STEP_INDEX", 1]]
      ],
      ["COND",
        ["EQUAL", "$NEW_STEP_INDEX", 0],
        [
          ["LOG", "{{$ALIAS_N}} increased the round number by 1."],
          ["INCREASE_VAL", "/roundNumber", 1],
        ]
      ],
      ["VAR", "$STEP_ID", "$GAME_DEF.stepOrder.[$NEW_STEP_INDEX]"],
      ["LOG", "$ALIAS_N", " advanced the round step to ", "$GAME_DEF.steps.$STEP_ID.label", "."],
      ["SET", "/stepId", "$STEP_ID"],

    ]
    game = Evaluate.evaluate(game, next_step_action_list, trace ++ ["next_step_action_list"])
    # Remove step tokens
    game = TempTokens.remove_all_for_timing(game, "step")
    # Remove phase tokens if the phase has changed
    game = if game_def["steps"][game["stepId"]]["phaseId"] == game_def["steps"][game_old["stepId"]]["phaseId"] do
      TempTokens.remove_all_for_timing(game, "phase")
    else
      game
    end
    # Remove round tokens if the round has changed
    game = if game["roundNumber"] != game_old["roundNumber"] do
      TempTokens.remove_all_for_timing(game, "round")
    else
      game
    end
    game
  end


end
