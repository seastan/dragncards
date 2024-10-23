defmodule DragnCardsGame.Evaluate.Functions.ADVANCE_TO_STEP do
  alias DragnCardsGame.Evaluate
  @moduledoc """
  *Arguments*:
  1. `stepId` (string)

  Advances `$GAME.stepId` from its present value to `stepId`. Calls `SET` on each stepId in between to trigger automations.

  *Returns*:
  (game state) The game state with the step advanced to `stepId`.
  """

  @doc """
  Executes the 'ADVANCE_TO_STEP' operation with the given arguments.

  ## Parameters

    - `args`: The arguments required for the 'ADVANCE_TO_STEP' operation.

  ## Returns

  The result of the 'ADVANCE_TO_STEP' operation.
  """
  def execute(game, code, trace) do
    step_id = Evaluate.evaluate(game, Enum.at(code, 1), trace ++ ["stepId"])
    step_order = game["stepOrder"]
    # If the stepId is not in the list of steps, return the game state as is
    if not Enum.member?(step_order, step_id) do
      raise "Tried to advance the game to a unknown step: #{inspect(step_id)}"
    end
    # Make a while loop that calls NEXT_STEP until game["stepId"] is equal to step_id
    Enum.reduce_while(0..Enum.count(step_order), game, fn i, acc ->
      acc = Evaluate.evaluate(acc, ["NEXT_STEP"], trace ++ ["next_step"])
      if acc["stepId"] == step_id do
        {:halt, acc}
      else
        {:cont, acc}
      end
    end)
  end


end
