defmodule DragnCardsGame.Evaluate.Functions.ABILITY do
  alias DragnCardsGame.{Evaluate}
  @moduledoc """
  *Arguments*:
  1. `card_id`
  2. `side`

  Gets the card's databaseId and calls the ability DragnLang code as defined in `gameDef.automation.cards.<databaseId>.ability.<side>`

  *Returns*:
  (game state) The game state after executing the ability code.
  """

  @doc """
  Executes the 'ABILITY' operation with the given arguments.

  ## Parameters

    - `args`: The arguments required for the 'ABILITY' operation.

  ## Returns

  The result of the 'ABILITY' operation.
  """
  def execute(game, code, trace) do
    card_id = Evaluate.evaluate(game, Enum.at(code, 1), trace ++ ["list"])
    card = get_in(game, ["cardById", card_id])
    side = Evaluate.evaluate(game, Enum.at(code, 2), trace ++ ["list"])
    Evaluate.evaluate(game, [
      ["VAR", "$THIS_ID", card_id],
      ["VAR", "$THIS", card],
      ["ACTION_LIST", "$GAME.cardById.#{card_id}.sides.#{side}.ability"]
    ], trace ++ ["ability"])
  end

end
