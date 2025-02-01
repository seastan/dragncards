defmodule DragnCardsGame.Evaluate.Functions.DELETE_CARD do
  alias DragnCardsGame.{Evaluate, GameUI}
  @moduledoc """
  *Arguments*:
  1. `cardId` (string)

  Deletes the card with `cardId` from the game state. If the card is the only card in its stack, the stack is also deleted.

  *Returns*:
  (game state) The game state with the card deleted.
  """

  @doc """
  Executes the 'DELETE_CARD' operation with the given arguments.

  ## Parameters

    - `args`: The arguments required for the 'DELETE_CARD' operation.

  ## Returns

  The result of the 'DELETE_CARD' operation.
  """
  def execute(game, code, trace) do
    card_id = Evaluate.evaluate(game, Enum.at(code, 1), trace ++ ["card_id"])
    try do
      GameUI.delete_card(game, card_id)
    rescue
      e ->
        raise("Failed to delete card #{card_id}. " <> inspect(e) <> inspect(trace))
    end
  end


end
