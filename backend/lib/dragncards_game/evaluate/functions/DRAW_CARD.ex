defmodule DragnCardsGame.Evaluate.Functions.DRAW_CARD do
  alias DragnCardsGame.{Evaluate, GameUI}
  @moduledoc """
  *Arguments*:
  1. `num` (number) (optional, defaults to 1)
  2. `playerI` (string) (optional)

  Draws `num` cards from the `playerI`'s deck to their hand. If `playerI` is not provided, it defaults to the current player. This function requires that you have groups named `playerIDeck` and `playerIHand` for `I = 1, 2, ... gameDef.maxplayers`.

  *Returns*:
  (game state) The game state with the cards drawn.
  """

  @doc """
  Executes the 'DRAW_CARD' operation with the given arguments.

  ## Parameters

    - `args`: The arguments required for the 'DRAW_CARD' operation.

  ## Returns

  The result of the 'DRAW_CARD' operation.
  """
  def execute(game, code, trace) do
    argc = Evaluate.argc(code, 0, 2)
    num = if argc == 0 do 1 else Evaluate.evaluate(game, Enum.at(code, 1), trace ++ ["num"]) end
    # If num is non-numeric or less than 0, raise an error.
    if not is_number(num) or num < 0 do
      raise("DRAW_CARD: num must be a non-negative number, got #{inspect(num)}")
    end
    player_n = if argc == 2 do Evaluate.evaluate(game, Enum.at(code, 2), trace ++ ["player_n"]) else Evaluate.evaluate(game, "$PLAYER_N", trace ++ ["player_n"]) end
    # if player_n is not a string like "player1", raise an error.
    if not is_binary(player_n) or not String.starts_with?(player_n, "player") do
      raise("DRAW_CARD: player_n must be a string like 'player1', got #{inspect(player_n)}")
    end
    GameUI.move_stacks(game, player_n <> "Deck", player_n <> "Hand", num, "bottom")
  end


end
