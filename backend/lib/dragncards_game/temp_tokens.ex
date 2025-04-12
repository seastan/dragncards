defmodule DragnCardsGame.TempTokens do
  @moduledoc """
  Represents the temporary tokens used in the game.
  """
  require Logger
  alias DragnCardsGame.{Evaluate, Tokens}

  @type t :: map()

  @spec new() :: map()
  def new() do
    %{
      "step" => %{},
      "phase" => %{},
      "round" => %{},
    }
  end

  @spec add(map(), String.t(), String.t(), String.t(), integer()) :: map()
  def add(game, timing, card_id, token_type, amount) do
    temp_tokens = game["tempTokens"]
    temp_tokens = Map.update(temp_tokens, timing, %{}, fn timing_map ->
      Map.update(timing_map, card_id, %{token_type => amount}, fn token_map ->
        Map.update(token_map, token_type, amount, &(&1 + amount))
      end)
    end)
    Map.put(game, "tempTokens", temp_tokens)
  end

  def remove_all_for_timing(game, timing) do
    remove_action_list = [
      ["FOR_EACH_KEY_VAL", "$CARD_ID", "$TOKEN_OBJ", "$GAME.tempTokens.#{timing}", [
        ["COND",
          "$GAME.cardById.$CARD_ID.inPlay",
          ["FOR_EACH_KEY_VAL", "$TOKEN_ID", "$VAL", "$TOKEN_OBJ", [
            ["DECREASE_VAL", "/cardById/$CARD_ID/tokens/$TOKEN_ID", "$VAL"],
          ]]
        ]
      ]],
      ["SET", "/tempTokens/#{timing}", %{}]
    ]
    game = Evaluate.evaluate(game, remove_action_list, ["remove_all_for_timing"])
    game
  end
end
