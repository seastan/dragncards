defmodule DragnCardsGame.Evaluate.Functions.TIME_IT do
  alias DragnCardsGame.Evaluate
  @moduledoc """
  *Arguments*:
  1. `label` (string)
  2. `code` (array)

  Executes the `code` and logs the time taken to execute it with the given `label`.
  *Returns*:
  (game state) The game state after executing the `code`.

  *Examples*:

  ```
  ["TIME_IT", "Drawing a card", ["DRAW_CARD"]]
  ```
  This will log the time taken to draw a card with the label "Drawing a card".

  """

  @doc """
  Executes the 'TIME_IT' operation with the given arguments.
  ## Parameters

    - `args`: The arguments required for the 'TIME_IT' operation.
  ## Returns
  The result of the 'TIME_IT' operation.
  """
  def execute(game, code, trace) do
    label = Evaluate.evaluate(game, Enum.at(code, 1), trace ++ ["label"])
    code = Enum.at(code, 2)
    start_time = :os.system_time(:millisecond)
    game = Evaluate.evaluate(game, code, trace ++ ["timed code"])
    end_time = :os.system_time(:millisecond)
    time_taken = end_time - start_time
    game = Evaluate.evaluate(game, ["LOG", label <> " took " <> Integer.to_string(time_taken) <> " ms"], trace ++ ["log"])
    game
  end
end
