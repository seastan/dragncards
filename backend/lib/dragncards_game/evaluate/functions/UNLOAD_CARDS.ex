defmodule DragnCardsGame.Evaluate.Functions.UNLOAD_CARDS do
  alias DragnCardsGame.{Evaluate, GameUI, PluginCache}
  alias DragnCards.Plugins
  @moduledoc """
  *Arguments*:
  1. `playerI` (string like "shared" or "player1")

  Unloads the cards from the given player's deck. If `playerI` is "shared", it unloads the shared cards.

  *Returns*:
  (game state) The game with the cards unloaded.
  *Examples*:

  """

  def add_load_code_to_history(game, load_code, player_n, trace) do

    new_entry = %{
      "loadCode" => load_code,
      "playerN" => player_n
    }

    old_load_list_history = get_in(game, ["loadCardsHistory"]) || []
    new_load_list_history = old_load_list_history ++ [new_entry]

    game
    |> put_in(["loadCardsHistory"], new_load_list_history)
  end


  @doc """
  Executes the 'UNLOAD_CARDS' operation with the given arguments.

  ## Parameters

    - `args`: The arguments required for the 'UNLOAD_CARDS' operation.

  ## Returns

  The result of the 'UNLOAD_CARDS' operation.
  """
  def execute(game, code, trace) do
    player_i = Evaluate.evaluate(game, Enum.at(code, 1), trace ++ ["player_i"])

    unload_code = [
        ["FOR_EACH_KEY_VAL", "$CARD_ID", "$CARD", "$CARD_BY_ID", [
          ["COND",
            ["EQUAL", "$CARD.controller", player_i],
            ["DELETE_CARD", "$CARD_ID"]
          ]
        ]],
        ["LOG", "$ALIAS_N", " deleted all their cards."]
      ]

    unload_code = if player_i == "shared" do
      [
        ["FOR_EACH_KEY_VAL", "$CARD_ID", "$CARD", "$CARD_BY_ID", [
          ["COND",
            ["OR",
              ["EQUAL", "$CARD.controller", nil],
              ["NOT_EQUAL", ["SUBSTRING", "$CARD.controller", 0, 6], "player"],
            ],
            ["DELETE_CARD", "$CARD_ID"]
          ]
        ]],
        ["LOG", "$ALIAS_N", " deleted all shared cards."]
      ]
    else
      unload_code
    end

    game = Evaluate.evaluate(game, unload_code, trace ++ ["unload_code"])
    game = add_load_code_to_history(game, unload_code, player_i, trace)

  end


end
