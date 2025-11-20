defmodule DragnCardsGame.Evaluate.Functions.REQUEST_POST do
  alias DragnCardsGame.Evaluate
  @moduledoc """
  *Arguments*:
  1. `url` (string) - The endpoint URL
  2. `body` (map) - The request body (will be JSON encoded)
  3. `headers` (map, optional) - Custom headers as key-value pairs

  Makes an HTTP POST request with a JSON body and optional custom headers.
  Returns the parsed JSON response.

  *Returns*:
  (map/list) The parsed JSON response data.

  *Example without custom headers*:
  ```
  ["REQUEST_POST",
    "https://api.example.com/endpoint",
    ["OBJ", "key1", "value1", "key2", "value2"]
  ]
  ```

  *Example with custom headers (like authorization)*:
  ```
  ["REQUEST_POST",
    "https://gapi.rangersdb.com/v1/graphql",
    ["OBJ",
      "operationName", "getCampaign",
      "variables", ["OBJ", "campaignId", 6642],
      "query", "query getCampaign($campaignId: Int!) { ... }"
    ],
    ["OBJ",
      "authorization", "Bearer YOUR_TOKEN_HERE"
    ]
  ]
  ```
  """

  @doc """
  Executes the 'REQUEST_POST' operation with the given arguments.

  ## Parameters

    - `game`: The current game state.
    - `code`: The code containing the URL, body, and optional headers.
    - `trace`: The trace for debugging.

  ## Returns

  The parsed JSON response data.
  """
  def execute(game, code, trace) do
    Evaluate.argc(code, 2, 3)
    url = Evaluate.evaluate(game, Enum.at(code, 1), trace ++ ["url"])
    body = Evaluate.evaluate(game, Enum.at(code, 2), trace ++ ["body"])
    custom_headers = if Enum.count(code) > 3 do
      Evaluate.evaluate(game, Enum.at(code, 3), trace ++ ["headers"])
    else
      %{}
    end

    if !is_binary(url) do
      raise "REQUEST_POST: url must be a string"
    end
    if !is_map(body) do
      raise "REQUEST_POST: body must be a map"
    end
    if !is_map(custom_headers) do
      raise "REQUEST_POST: headers must be a map"
    end

    # Encode body as JSON
    json_body = Jason.encode!(body)

    # Build headers list
    base_headers = [
      {"Content-Type", "application/json"},
      {"Accept", "application/json"},
      {"User-Agent", "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36"}
    ]

    # Add custom headers, converting map to list of tuples
    custom_headers_list = Enum.map(custom_headers, fn {k, v} -> {to_string(k), to_string(v)} end)
    headers = base_headers ++ custom_headers_list

    case HTTPoison.post(url, json_body, headers, recv_timeout: 10000) do
      {:ok, %HTTPoison.Response{status_code: status_code, body: response_body}} when status_code in 200..299 ->
        case Jason.decode(response_body) do
          {:ok, json_data} ->
            json_data
          {:error, error} ->
            raise "REQUEST_POST: Failed to parse JSON response - #{inspect(error)}"
        end
      {:ok, %HTTPoison.Response{status_code: status_code, body: response_body}} ->
        raise "REQUEST_POST: HTTP request failed with status code #{status_code}, body: #{response_body}"
      {:error, %HTTPoison.Error{reason: reason}} ->
        raise "REQUEST_POST: HTTP request failed - #{inspect(reason)}"
    end
  end
end
