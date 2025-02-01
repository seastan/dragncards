defmodule DragnCardsGame.Evaluate.Functions.LOG do
  alias DragnCardsGame.Evaluate
  alias DragnCardsChat.{ChatMessage}
  @moduledoc """
  *Arguments*:
  Any number of string arguments.

  Concatenates all messages and adds them as a line in the log.

  *Returns*:
  (game state) The game state with the messages added to the log.

  *Example*:
  ```
  [
    ["LOG", "$ALIAS_N", " added 1 damage token to ", "$ACTIVE_CARD.currentFace.name"],
    ["INCREASE_VAL", "/cardById/$ACTIVE_CARD_ID/currentFace/tokens/damage", 1]
  ]
  ```
  It is often more convenient to write logs as a single string using the `{{}}` syntax. The following example is equivalent to the previous one:
  ```
  [
    ["LOG", "{{$ALIAS_N}} added 1 damage token to {{$ACTIVE_CARD.currentFace.name}}"],
    ["INCREASE_VAL", "/cardById/$ACTIVE_CARD_ID/currentFace/tokens/damage", 1]
  ]
  ```


  """

  @doc """
  Executes the 'LOG' operation with the given arguments.

  ## Parameters

    - `args`: The arguments required for the 'LOG' operation.

  ## Returns

  The result of the 'LOG' operation.
  """
  def execute(game, code, trace) do
    statements = Enum.slice(code, 1, Enum.count(code))
    #message = try do
    message = Evaluate.message_list_to_string(game, statements, trace ++ ["message_list_to_string"])
    #rescue
    #  _ ->
    #    Enum.join(statements, "")
    #end
    put_in(game["messages"], game["messages"] ++ [message])
  end


end
