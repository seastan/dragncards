defmodule DragnCardsGame.Evaluate.Functions.FADE_TEXT_CARD do
  alias DragnCardsGame.Evaluate
  @moduledoc """
  *Arguments*:
  1. `cardId` (string or list of strings) - card id(s) to display text on
  2. `label` (string) - the text to display
  3. `duration` (number, optional) - how long the text stays on screen, in seconds

  Displays fading text on top of the specified card(s). The text will fade in,
  hold for `duration` seconds, then fade out.
  If `duration` is not given, the engine's default hold time is used.
  If `duration` is -1, the text stays on screen until the next fade text message
  for that card replaces it.

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

  Display "+2 Attack" for 3 seconds:
  ```
  ["FADE_TEXT_CARD", "$cardId", "+2 Attack", 3]
  ```

  Display "Targeted" until the next message replaces it:
  ```
  ["FADE_TEXT_CARD", "$cardId", "Targeted", -1]
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
    duration = if Enum.count(code) > 3 do
      Evaluate.evaluate(game, Enum.at(code, 3), trace ++ ["duration"])
    else
      nil
    end

    if duration != nil and not is_number(duration) do
      raise "FADE_TEXT_CARD failed: duration must be a number, got #{inspect(duration)}."
    end

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

    entry = %{"text" => label, "duration" => duration}

    # Add entry to each card's list
    updated_card_map = Enum.reduce(card_id_list, fade_text["card"] || %{}, fn card_id, acc ->
      card_list = acc[card_id] || []
      Map.put(acc, card_id, card_list ++ [entry])
    end)

    updated_fade_text = put_in(fade_text, ["card"], updated_card_map)

    # Update the game state
    Map.put(game, "fadeText", updated_fade_text)
  end
end
