defmodule DragnCardsGame.Evaluate.Functions.FADE_TEXT_CARD do
  alias DragnCardsGame.Evaluate
  @moduledoc """
  *Arguments*:
  1. `cardId` (string or list of strings) - card id(s) to display text on
  2. `label` (string) - the text to display

  Displays fading text on top of the specified card(s). The text will fade in,
  hold for 0.5 seconds, then fade out.

  *Returns*:
  (game state) The updated game state with the fade text added.

  *Examples*:

  Display "+2 Attack" on a specific card:
  ```
  ["FADE_TEXT_CARD", "$cardId", "+2 Attack"]
  ```

  Display "Exhausted" on multiple cards:
  ```
  ["FADE_TEXT_CARD", ["card1", "card2", "card3"], "Exhausted"]
  ```
  """

  @doc """
  Executes the 'FADE_TEXT_CARD' operation with the given arguments.

  ## Parameters

    - `game`: The current game state
    - `code`: The code containing the function call and arguments
    - `trace`: The execution trace for debugging

  ## Returns

  The updated game state with fade text added.
  """
  def execute(game, code, trace) do
    card_ids = Evaluate.evaluate(game, Enum.at(code, 1), trace ++ ["card_ids"])
    label = Evaluate.evaluate(game, Enum.at(code, 2), trace ++ ["label"])

    # Normalize to list
    card_id_list = if is_list(card_ids), do: card_ids, else: [card_ids]

    # Validate all card ids exist
    Enum.each(card_id_list, fn card_id ->
      if not Map.has_key?(game["cardById"] || %{}, card_id) do
        raise "FADE_TEXT_CARD failed: card '#{card_id}' not found in game."
      end
    end)

    # Get existing fadeText structure or initialize
    fade_text = game["fadeText"] || %{"player" => %{}, "card" => %{}}

    # Add label to each card's list
    updated_card_map = Enum.reduce(card_id_list, fade_text["card"] || %{}, fn card_id, acc ->
      card_list = acc[card_id] || []
      Map.put(acc, card_id, card_list ++ [label])
    end)

    updated_fade_text = put_in(fade_text, ["card"], updated_card_map)

    # Update the game state
    Map.put(game, "fadeText", updated_fade_text)
  end
end
