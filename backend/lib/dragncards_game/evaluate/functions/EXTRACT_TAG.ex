defmodule DragnCardsGame.Evaluate.Functions.EXTRACT_TAG do
  alias DragnCardsGame.Evaluate
  @moduledoc """
  *Arguments*:
  1. `html` (string) - The HTML content to parse
  2. `tag_name` (string) - The tag name to extract (e.g., "script", "div")
  3. `id` (string) - The ID attribute value to match (e.g., "__NEXT_DATA__")

  Extracts the text content from an HTML tag with a specific ID.
  Useful for extracting embedded JSON data from script tags.

  *Returns*:
  (string) The text content inside the tag, or nil if not found.

  *Example*:
  ```
  ["EXTRACT_TAG", $html, "script", "__NEXT_DATA__"]
  ```
  """

  @doc """
  Executes the 'EXTRACT_TAG' operation with the given arguments.

  ## Parameters

    - `game`: The current game state.
    - `code`: The code containing the HTML, tag name, and ID arguments.
    - `trace`: The trace for debugging.

  ## Returns

  The text content of the tag, or nil if not found.
  """
  def execute(game, code, trace) do
    Evaluate.argc(code, 3)
    html = Evaluate.evaluate(game, Enum.at(code, 1), trace ++ ["html"])
    tag_name = Evaluate.evaluate(game, Enum.at(code, 2), trace ++ ["tag_name"])
    id = Evaluate.evaluate(game, Enum.at(code, 3), trace ++ ["id"])

    if !is_binary(html) do
      raise "EXTRACT_TAG: html must be a string"
    end
    if !is_binary(tag_name) do
      raise "EXTRACT_TAG: tag_name must be a string"
    end
    if !is_binary(id) do
      raise "EXTRACT_TAG: id must be a string"
    end

    # Build regex pattern to match the tag with the specific ID
    # Example: <script id="__NEXT_DATA__">...</script>
    pattern = ~r/<#{tag_name}[^>]*\sid=["']#{Regex.escape(id)}["'][^>]*>(.*?)<\/#{tag_name}>/s

    case Regex.run(pattern, html) do
      [_full_match, content] ->
        content
      nil ->
        nil
    end
  end
end
