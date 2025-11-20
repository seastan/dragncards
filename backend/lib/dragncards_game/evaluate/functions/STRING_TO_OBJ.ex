defmodule DragnCardsGame.Evaluate.Functions.STRING_TO_OBJ do
  alias DragnCardsGame.Evaluate
  @moduledoc """
  *Arguments*:
  1. `json_string` (string)

  Parses a JSON string and returns the corresponding Elixir data structure (map or list).

  *Returns*:
  (map/list) The parsed JSON data.

  *Example*:
  ```
  ["STRING_TO_OBJ", "{\"name\": \"John\", \"age\": 30}"]
  ```
  """

  @doc """
  Executes the 'STRING_TO_OBJ' operation with the given argument.

  ## Parameters

    - `game`: The current game state.
    - `code`: The code containing the JSON string argument.
    - `trace`: The trace for debugging.

  ## Returns

  The parsed JSON data as a map or list.
  """
  def execute(game, code, trace) do
    Evaluate.argc(code, 1)
    json_string = Evaluate.evaluate(game, Enum.at(code, 1), trace ++ ["json_string"])

    if !is_binary(json_string) do
      raise "STRING_TO_OBJ: json_string must be a string"
    end

    case Jason.decode(json_string) do
      {:ok, data} ->
        data
      {:error, error} ->
        raise "STRING_TO_OBJ: Failed to parse JSON - #{inspect(error)}"
    end
  end
end
