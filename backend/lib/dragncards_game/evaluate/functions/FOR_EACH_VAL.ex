defmodule DragnCardsGame.Evaluate.Functions.FOR_EACH_VAL do
  alias DragnCardsGame.Evaluate
  @moduledoc """
  *Arguments*:
  1. `valName` (string starting with $)
  2. `list` (list)
  3. `function` (DragnLang code)

  Iterates over the values in `list`, assigning each value to `valName`.

  *Returns*:
  (any) The result of the successive calling of `function` with each value assigned to `valName`.

  *Example*:
  ```
  [
    ["FOR_EACH_VAL", "$CARD", "$GAME.groupById.player1Deck.parentCards, [
      ["LOG", "{{$CARD.currentFace.name}} is in {{$GAME.groupById.player1Deck.label}}."]
    ]
  ]
  ```
  """

  @doc """
  Executes the 'FOR_EACH_VAL' operation with the given arguments.

  ## Parameters

    - `args`: The arguments required for the 'FOR_EACH_VAL' operation.

  ## Returns

  The result of the 'FOR_EACH_VAL' operation.
  """
  def execute(game, code, trace) do
    val_name = Enum.at(code, 1)
    Evaluate.argt("FOR_EACH_VAL", 0, "variable", val_name)
    list = Evaluate.evaluate(game, Enum.at(code, 2), trace ++ ["list"])
    Evaluate.argt("FOR_EACH_VAL", 1, "list", list)
    function = Enum.at(code, 3)
    Evaluate.argt("FOR_EACH_VAL", 2, "code", function)
    if !is_list(function) do
      raise "FOR_EACH_VAL: arg 2 must be DragnLang code"
    end
    Enum.reduce(Enum.with_index(list), game, fn({val, index}, acc) ->
      acc = Evaluate.evaluate(acc, ["VAR", val_name, val], trace ++ ["index #{index}"])
      Evaluate.evaluate(acc, function, trace ++ ["index #{index}"])
    end)
    # # Delete local variable
    # game
    # |> put_in(["variables"], Map.delete(game["variables"], "#{val_name}-#{current_scope_index}"))
  end


end
