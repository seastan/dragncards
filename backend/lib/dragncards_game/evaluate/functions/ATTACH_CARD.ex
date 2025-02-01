defmodule DragnCardsGame.Evaluate.Functions.ATTACH_CARD do
  alias DragnCardsGame.{Evaluate, GameUI}
  @moduledoc """
  *Arguments*:
  1. `cardId` (string)
  2. `destCardId` (string)
  3. `options` (object, optional)

  Attaches the card with `cardId` to the card with `destCardId`.

    See `MOVE_CARD` for details on the `options` object.

  *Returns*:
  (game state) The game state with the card attached.
  """

  @doc """
  Executes the 'ATTACH_CARD' operation with the given arguments.

  ## Parameters

    - `args`: The arguments required for the 'ATTACH_CARD' operation.

  ## Returns

  The result of the 'ATTACH_CARD' operation.
  """
  def execute(game, code, trace) do
    argc = Evaluate.argc(code, 2, 3)
    card_id = Evaluate.evaluate(game, Enum.at(code, 1), trace ++ ["card_id"])
    dest_card_id = Evaluate.evaluate(game, Enum.at(code, 2), trace ++ ["dest_card_id"])
    dest_card = game["cardById"][dest_card_id]
    options = if argc == 3 do Evaluate.evaluate(game, Enum.at(code, 3), trace ++ ["options"]) else %{"combine" => "right"} end
    try do
      game = GameUI.move_card(game, card_id, dest_card["groupId"], dest_card["stackIndex"], -1, options)

    rescue
      _ ->
        raise("Failed to attach card_id: #{inspect(card_id)} to dest_card_id: #{inspect(dest_card_id)}. ")
    end
  end


end
