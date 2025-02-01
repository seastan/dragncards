defmodule DragnCardsGame.Tokens do
  @moduledoc """
  Tokens on a card.
  """

  @type t :: Map.t()

  @spec new(Map.t()) :: Map.t()
  def new(game_def) do
    tokensDef = game_def["tokens"]
    Enum.reduce(tokensDef, %{}, fn({tokenType, _tokenDefDetails}, acc) ->
      Map.put(acc, tokenType, 0)
    end)
  end
end
