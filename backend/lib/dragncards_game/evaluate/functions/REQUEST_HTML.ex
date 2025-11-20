defmodule DragnCardsGame.Evaluate.Functions.REQUEST_HTML do
  alias DragnCardsGame.Evaluate
  @moduledoc """
  *Arguments*:
  1. `url` (string)

  Makes an HTTP GET request to the given URL and returns the HTML response as a string.
  Includes browser-like User-Agent header to avoid being blocked by some sites.

  *Returns*:
  (string) The HTML content from the URL.

  *Example*:
  ```
  ["REQUEST_HTML", "https://example.com/page"]
  ```
  """

  @doc """
  Executes the 'REQUEST_HTML' operation with the given argument.

  ## Parameters

    - `game`: The current game state.
    - `code`: The code containing the URL argument.
    - `trace`: The trace for debugging.

  ## Returns

  The HTML content from the URL as a string.
  """
  def execute(game, code, trace) do
    Evaluate.argc(code, 1)
    url = Evaluate.evaluate(game, Enum.at(code, 1), trace ++ ["url"])

    if !is_binary(url) do
      raise "REQUEST_HTML: url must be a string"
    end

    # Browser-like headers to avoid being blocked
    headers = [
      {"User-Agent", "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36"},
      {"Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"}
    ]

    case HTTPoison.get(url, headers, recv_timeout: 10000) do
      {:ok, %HTTPoison.Response{status_code: 200, body: body}} ->
        body
      {:ok, %HTTPoison.Response{status_code: status_code}} ->
        raise "REQUEST_HTML: HTTP request failed with status code #{status_code}"
      {:error, %HTTPoison.Error{reason: reason}} ->
        raise "REQUEST_HTML: HTTP request failed - #{inspect(reason)}"
    end
  end
end
