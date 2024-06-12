defmodule DragnCardsGame.Evaluate.Functions.GET_CARD do
  alias DragnCardsGame.Evaluate
  @moduledoc """
  *Arguments*:
  1. `groupId` (string)
  2. `stackIndex` (number)
  3. `cardIndex` (number)

  Returns the card at the given `cardIndex` in the stack with the given `groupId` and `stackIndex`. If the stack is null, it returns null.

  *Returns*:
  (card) The card.
  """

  @doc """
  Executes the 'GET_CARD' operation with the given arguments.

  ## Parameters

    - `args`: The arguments required for the 'GET_CARD' operation.

  ## Returns

  The result of the 'GET_CARD' operation.
  """
  def execute(game, code, trace) do
    IO.puts("Getting card")
    IO.inspect(code)
    card_id = Evaluate.evaluate(game, ["GET_CARD_ID", Enum.at(code,1), Enum.at(code,2), Enum.at(code,3)], trace ++ ["get_card_id"])
    IO.puts("Card id: #{card_id}")
    if card_id do Evaluate.evaluate(game, "$GAME.cardById.#{card_id}", trace) else nil end
  end


end
