defmodule DragnCardsGame.Evaluate.Functions.RESET_INDEX do
  alias DragnCardsGame.{Evaluate, GameUI}
  @moduledoc """
  *Arguments*:
  None

  Calls "SET" on the current stackIndex and cardIndex of each card in the game, triggering any automations that listen to those values.

  The built-in move functions like `MOVE_CARD` and `MOVE_STACK` update the `stackIndex` and `cardIndex` of cards automatically, but don't use `SET` while doing so, so automations that are listening to those values won't trigger. This function can be used after a card moves to trigger those automations manually.

  *Returns*:
  (game state) The game state.
  """

  @doc """
  Executes the 'RESET_INDEX' operation with the given arguments.

  ## Parameters

    - `args`: The arguments required for the 'RESET_INDEX' operation.

  ## Returns

  The result of the 'RESET_INDEX' operation.
  """
  def execute(game, _code, _trace) do
    Enum.reduce(game["groupById"], game, fn({_group_id, group}, acc) ->
      Enum.reduce(Enum.with_index(group["stackIds"]), acc, fn({stack_id, stack_index}, acc1) ->
        stack = GameUI.get_stack(acc1, stack_id)
        Enum.reduce(Enum.with_index(stack["cardIds"]), acc1, fn({card_id, card_index}, acc2) ->
          acc2
          |> Evaluate.evaluate(["SET", "/cardById/" <> card_id <> "/stackIndex", stack_index], ["update_card_state orig_group stack_index:#{stack_index}"])
          |> Evaluate.evaluate(["SET", "/cardById/" <> card_id <> "/cardIndex", card_index], ["update_card_state orig_group card_index:#{card_index}"])
        end)
      end)
    end)
  end


end
