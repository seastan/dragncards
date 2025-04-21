defmodule DragnCardsGame.Evaluate.Functions.REMOVE_ALL_TEMP_TOKENS do
  alias DragnCardsGame.{Evaluate, GameUI, TempTokens}
  @moduledoc """
  *Arguments*:
  1. `timing` ('step'|'phase'|'round')

  Removes all temporary tokens from a card that were added during the given `timing` phase.

  *Returns*:
  (game state) The game state with all temporary tokens removed for the given `timing`.

  *Examples*:

  ```
  ["REMOVE_ALL_TEMP_TOKENS", "phase"]
  ```

  """
  @doc """
  Executes the 'REMOVE_ALL_TEMP_TOKENS' operation with the given arguments.

  ## Parameters

    - `args`: The arguments required for the 'REMOVE_ALL_TEMP_TOKENS' operation.

  ## Returns

  The result of the 'REMOVE_ALL_TEMP_TOKENS' operation.
  """
  def execute(game, code, trace) do

    argc = Evaluate.argc(code, 1)
    timing = Evaluate.evaluate(game, Enum.at(code, 1), trace ++ ["timing"])

    TempTokens.remove_all_for_timing(game, timing)
  end



end
