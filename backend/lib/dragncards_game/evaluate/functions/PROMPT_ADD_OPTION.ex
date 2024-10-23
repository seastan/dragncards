defmodule DragnCardsGame.Evaluate.Functions.PROMPT_ADD_OPTION do
  alias DragnCardsGame.Evaluate
  alias DragnCards.Plugins
  @moduledoc """
  *Arguments*:
  1. `targetPlayerI` (string like "player1") or `targetPlayerList` (list of such strings)
  2. `label` (string)
  3. `hotkey` (string)
  4. `promptCode` (DragnLang code, optional)

  Adds an option to the most recent prompt for the given player(s).

  *Returns*:
  (game state) The updated game state.

  *Examples*:

  Assuming player1 currently has a prompt to let them press `1` to "Deal 1 damage to player 2", and you want to add an option to allow them to press `5` to deal 5 damage instead:
  ```
  ["PROMPT_ADD_OPTION",
    "player1",
    "Deal 5 damage to player 2",
    "5",
    [
      ["LOG", ["GET_ALIAS", "player1"], " dealt 5 damage to ", ["GET_ALIAS", "player2"]],
      ["DECREASE_VAL", "/playerData/player2/health", 5]
    ]
  ]
  ```
  """

  @doc """
  Executes the 'PROMPT_ADD_OPTION' operation with the given arguments.

  ## Parameters

    - `args`: The arguments required for the 'PROMPT_ADD_OPTION' operation.

  ## Returns

  The result of the 'PROMPT_ADD_OPTION' operation.
  """
  def execute(game, code, trace) do
    argc = Evaluate.argc(3, 4)
    target_player_list = Evaluate.evaluate(game, Enum.at(code, 1), trace ++ ["target_player_n"])
    target_player_list = if is_list(target_player_list) do
      target_player_list
    else
      [target_player_list]
    end
    label = Evaluate.evaluate(game, Enum.at(code, 2), trace ++ ["label"])
    hotkey = Evaluate.evaluate(game, Enum.at(code, 3), trace ++ ["hotkey"])
    prompt_code = if argc >= 4 do
      prompt_code = Evaluate.evaluate(game, Enum.at(code, 4), trace ++ ["prompt_code"])
      if not is_list(prompt_code) do
        raise "Code given to prompt option is not a list. Remember to use the \"LIST\" function to create a list. For example, [\"LIST\", \"SET\", \"/playerData/player1/health\", 10] will result in the action list [\"SET\", \"/playerData/player1/health\", 10] being assigned to the prompt option."
      end
      prompt_code = if is_list(Enum.at(prompt_code, 0)) do
        prompt_code
      else
        [prompt_code]
      end
    else
      nil
    end

    game = Enum.reduce(target_player_list, game, fn(target_player_n, acc) ->
      prompt_uuid = acc["playerData"][target_player_n]["mostRecentPromptId"]
      options = acc["playerData"][target_player_n]["prompts"][prompt_uuid]["options"]
      unset_command = ["UNSET", "/playerData/#{target_player_n}/prompts/#{prompt_uuid}"]
      prompt_code = prompt_code ++ [unset_command]
      new_option = %{
        "label" => label,
        "hotkey" => hotkey
      }
      new_option = if prompt_code != nil do
        put_in(new_option, ["code"], prompt_code)
      else
        new_option
      end
      new_options = options ++ [new_option]
      put_in(acc, ["playerData", target_player_n, "prompts", prompt_uuid, "options"], new_options)
    end)

    game
  end


end
