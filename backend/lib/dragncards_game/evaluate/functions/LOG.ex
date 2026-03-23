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

  *Rich text tokens*:

  Log messages support inline images, card hover links, and hyperlinks via embedded tokens. Tokens are separated from surrounding text by whitespace. All URLs must use `http` or `https`.

  | Token | Example | Renders as |
  |-------|---------|------------|
  | `img:<url>` | `img:https://example.com/icon.png` | Inline image at default height (2dvh) |
  | `img:<url>:<size>` | `img:https://example.com/icon.png:5` | Inline image at 5dvh height |
  | `img:card:<dbId>` | `img:card:01001` | Card image from the card DB at default height |
  | `img:card:<dbId>:<size>` | `img:card:01001:4` | Card image at 4dvh height |
  | `link:<url>` | `link:https://ringsdb.com` | Clickable hyperlink (URL as label) |
  | `link:<url>:<label>` | `link:https://ringsdb.com:RingsDB` | Clickable hyperlink with custom label |
  | `link:cardId:<id>` | `link:cardId:{{$ACTIVE_CARD_ID}}` | Card name as hoverable link; hover shows card image (side A) |
  | `link:cardId:<id>:<side>` | `link:cardId:{{$ACTIVE_CARD_ID}}:B` | Same but shows the specified side |
  | `link:cardDbId:<dbId>` | `link:cardDbId:01001` | Same as `link:cardId` but looks up by card DB id |
  | `link:cardDbId:<dbId>:<side>` | `link:cardDbId:01001:B` | Same with explicit side |

  *Example*:
  ```
  ["LOG", "{{$ALIAS_N}} played link:cardId:{{$ACTIVE_CARD_ID}} from their hand."]
  ```

  These tokens also work in prompt messages and option labels (see PROMPT).

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
