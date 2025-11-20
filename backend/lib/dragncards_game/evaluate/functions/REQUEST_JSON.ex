defmodule DragnCardsGame.Evaluate.Functions.REQUEST_JSON do
  alias DragnCardsGame.Evaluate
  @moduledoc """
  *Arguments*:
  1. `url` (string)

  Makes an HTTP GET request to the given URL and parses the JSON response.

  *Returns*:
  (map/list) The parsed JSON data from the URL.

  *Example*:
  ```
  ["REQUEST_JSON", "https://api.example.com/data"]
  ```
  """

  @doc """
  Executes the 'REQUEST_JSON' operation with the given argument.

  ## Parameters

    - `game`: The current game state.
    - `code`: The code containing the URL argument.
    - `trace`: The trace for debugging.

  ## Returns

  The parsed JSON data from the URL.
  """
  def execute(game, code, trace) do
    Evaluate.argc(code, 1)
    url = Evaluate.evaluate(game, Enum.at(code, 1), trace ++ ["url"])

    if !is_binary(url) do
      raise "REQUEST_JSON: url must be a string"
    end

    case HTTPoison.get(url, [{"Accept", "application/json"}], recv_timeout: 10000) do
      {:ok, %HTTPoison.Response{status_code: 200, body: body}} ->
        case Jason.decode(body) do
          {:ok, json_data} ->
            json_data
          {:error, error} ->
            raise "REQUEST_JSON: Failed to parse JSON response - #{inspect(error)}"
        end
      {:ok, %HTTPoison.Response{status_code: status_code}} ->
        raise "REQUEST_JSON: HTTP request failed with status code #{status_code}"
      {:error, %HTTPoison.Error{reason: reason}} ->
        raise "REQUEST_JSON: HTTP request failed - #{inspect(reason)}"
    end
  end
end
