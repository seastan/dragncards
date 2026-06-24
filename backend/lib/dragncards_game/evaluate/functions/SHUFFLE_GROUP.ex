defmodule DragnCardsGame.Evaluate.Functions.SHUFFLE_GROUP do
  alias DragnCardsGame.Evaluate
  @moduledoc """
  *Arguments*:
  1. `groupId` (string)

  Shuffles the cards in the group with the given ID.

  *Returns*:
  (game state) The updated game state.

  *Examples*:

  Shuffle the cards in the group with the ID `player1Deck`:
  ```
  ["SHUFFLE_GROUP", "player1Deck"]
  ```
  """

  @doc """
  Executes the 'SHUFFLE_GROUP' operation with the given arguments.

  ## Parameters

    - `args`: The arguments required for the 'SHUFFLE_GROUP' operation.

  ## Returns

  The result of the 'SHUFFLE_GROUP' operation.
  """
  def execute(game, code, trace) do
    group_id = Evaluate.evaluate(game, Enum.at(code, 1), trace ++ ["group_id"])
    stack_ids = game["groupById"][group_id]["stackIds"]
    shuffled_stack_ids = stack_ids |> Enum.shuffle
    game = Evaluate.evaluate(game, ["SET", "/groupById/#{group_id}/stackIds", ["LIST"] ++ shuffled_stack_ids], trace)

    # Notify clients that this group was shuffled so the dnc3d engine can play a
    # shuffle animation (pile regions only). Modeled on SELECT_CARDS: append one
    # entry per seated player to pendingGuiUpdates. The room channel broadcasts
    # shuffle updates to everyone (see send_gui_message handling), and each client
    # keeps the entry matching its own player via the targetPlayerN filter. The
    # nonce makes every shuffle a distinct value so a repeat shuffle of the same
    # group still triggers the client-side effect.
    num_players = game["numPlayers"] || 0
    nonce = System.unique_integer([:monotonic, :positive])
    gui_updates =
      if num_players > 0 do
        Enum.map(1..num_players, fn i ->
          %{
            "targetPlayerN" => "player" <> Integer.to_string(i),
            "updates" => %{
              "dnc3dShuffle" => %{
                "groupId" => group_id,
                "nonce" => nonce
              }
            }
          }
        end)
      else
        []
      end

    existing_gui_updates = Map.get(game, "pendingGuiUpdates", [])
    Map.put(game, "pendingGuiUpdates", existing_gui_updates ++ gui_updates)
  end


end
