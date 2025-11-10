defmodule DragnCardsGame.Evaluate.Functions.FADE_TEXT do
  alias DragnCardsGame.Evaluate
  @moduledoc """
  *Arguments*:
  1. `target` (string) - either "game" or a card id
  2. `label` (string) - the text to display

  Displays fading text either in the center of the screen (if target is "game")
  or on top of a specific card (if target is a card id). The text will fade in,
  hold for 0.5 seconds, then fade out.

  *Returns*:
  (game state) The updated game state with the fade text added.

  *Examples*:

  Display "Your Turn!" in the center of the screen:
  ```
  ["FADE_TEXT", "game", "Your Turn!"]
  ```

  Display "+2 Attack" on a specific card:
  ```
  ["FADE_TEXT", "$cardId", "+2 Attack"]
  ```
  """

  @doc """
  Executes the 'FADE_TEXT' operation with the given arguments.

  ## Parameters

    - `game`: The current game state
    - `code`: The code containing the function call and arguments
    - `trace`: The execution trace for debugging

  ## Returns

  The updated game state with fade text added.
  """
  def execute(game, code, trace) do
    target = Evaluate.evaluate(game, Enum.at(code, 1), trace ++ ["target"])
    label = Evaluate.evaluate(game, Enum.at(code, 2), trace ++ ["label"])

    # Validate target
    cond do
      target == "game" ->
        # Valid: "game" is allowed
        :ok

      is_binary(target) and Map.has_key?(game["cardById"] || %{}, target) ->
        # Valid: target is a card id that exists
        :ok

      true ->
        # Invalid: neither "game" nor a valid card id
        raise "FADE_TEXT target must be either 'game' or a valid card id. Got: #{inspect(target)}"
    end

    # Get existing fadeText structure or initialize
    fade_text = game["fadeText"] || %{"game" => [], "card" => %{}}

    # Update the appropriate list based on target
    updated_fade_text = if target == "game" do
      # Append label to game list
      game_list = fade_text["game"] || []
      put_in(fade_text, ["game"], game_list ++ [label])
    else
      # Append label to card-specific list
      card_map = fade_text["card"] || %{}
      card_list = card_map[target] || []
      put_in(fade_text, ["card", target], card_list ++ [label])
    end

    # Update the game state
    Map.put(game, "fadeText", updated_fade_text)
  end
end
