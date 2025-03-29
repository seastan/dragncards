defmodule DragnCardsGame.Evaluate.Functions.PROMPT do
  alias DragnCardsGame.{Evaluate, PluginCache}
  alias DragnCards.Plugins
  @moduledoc """
  *Arguments*:
  1. `targetPlayerI` (string like "player1") or `targetPlayerList` (list of such strings)
  2. `promptId` (string)

  Prompts the given player(s) with the prompt corresponding to `promptId`, as defined in `gameDef.prompts`.

  *Returns*:
  (game state) The updated game state.

  *Examples*:

  Assuming that in `gameDef.prompts` you have a prompt with the id `chooseTargetPlayer` that prompts the player to choose a target player, you can show this prompt to player1:
  ```
  ["PROMPT", "player1", "chooseTargetPlayer"]
  ```
  Show a prompt to player1 and player2 to choose a target player:
  ```
  ["PROMPT", ["LIST", "player1", "player2"], "chooseTargetPlayer"]
  ```
  Show a prompt to all players to choose a target player (using the built-in `$PLAYER_ORDER` variable to get the list of players in order of their turn):
  ```
  ["PROMPT", "$PLAYER_ORDER", "chooseTargetPlayer"]
  ```
  """

  @doc """
  Executes the 'PROMPT' operation with the given arguments.

  ## Parameters

    - `args`: The arguments required for the 'PROMPT' operation.

  ## Returns

  The result of the 'PROMPT' operation.
  """

  def execute(game, code, trace) do
    target_player_list = Evaluate.evaluate(game, Enum.at(code, 1), trace ++ ["target_player_n"])
    target_player_list = if is_list(target_player_list) do
      target_player_list
    else
      [target_player_list]
    end
    prompt_id = Evaluate.evaluate(game, Enum.at(code, 2), trace ++ ["prompt_id"])
    arg_vals = Enum.slice(code, 3, Enum.count(code))
    game_def = PluginCache.get_game_def_cached(game["options"]["pluginId"])

    orig_prompt = game_def["prompts"][prompt_id] || dragn_prompt(prompt_id)
    if orig_prompt == nil do
      raise "Prompt #{prompt_id} not found in game definition."
    end

    orig_args = orig_prompt["args"]
    orig_message = orig_prompt["message"]
    orig_options = cond do
      Map.has_key?(orig_prompt, "options") ->
        orig_prompt["options"]

      Map.has_key?(orig_prompt, "optionsActionList") ->
        Evaluate.evaluate(game, ["ACTION_LIST", orig_prompt["optionsActionList"]], trace ++ ["optionsActionList"])

      true ->
        raise ArgumentError, message: "Prompt #{prompt_id} must contain an 'options' or 'optionsActionList' key"
    end

    # Generate the variable definition statements that we to resolve the message and to prepended to the code
    multi_var_command = Enum.reduce(Enum.with_index(orig_args), ["MULTI_VAR_NO_EVAL"], fn({arg, index}, acc) ->
      [{arg_name, arg_val}] = cond do
        index >= Enum.count(arg_vals) -> # If we are beyond the range of input arguments, look for default arguments
          if is_map(arg) do
            Map.to_list(arg)
          else
            raise "Prompt #{prompt_id} expects #{Enum.count(orig_args)} arguments, but got #{Enum.count(arg_vals)}."
          end
        true -> # We are within the range of input arguments, so use the input argument
          arg_val = Evaluate.evaluate(game, Enum.at(arg_vals, index), trace ++ ["arg_val #{index}"]) # We evaluate the arguments now rather than when the prompt is triggered
          if is_map(arg) do
            arg_name = Enum.at(Map.keys(arg), 0)
            [{arg_name, arg_val}]
          else
            arg_name = arg
            [{arg_name, arg_val}]
          end
      end
      acc ++ [arg_name, arg_val]
    end)

    # Create a temporary game state to evaluate the message
    game_for_message = Evaluate.evaluate(game, multi_var_command, trace ++ ["define prompt args"])
    new_message = Evaluate.evaluate(game_for_message, orig_message, trace ++ ["message"])

    # Generate a new prompt with a new UUID and the resolved message
    prompt_uuid = Ecto.UUID.generate

    new_prompt = orig_prompt
    |> Map.put("promptId", prompt_id)
    |> Map.put("uuid", prompt_uuid)
    |> Map.put("message", new_message)
    |> Map.put("timestamp", DateTime.utc_now() |> DateTime.to_unix(:microsecond))

    game = Enum.reduce(target_player_list, game, fn(target_player_n, acc) ->
      # Prepend the "VAR" statements to each option's code so that when it gets evaluated, it will have the variables defined
      # Append a command to delete the prompt
      new_options = Enum.reduce(orig_options, [], fn(option, acc) ->
        unset_command = ["UNSET", "/playerData/#{target_player_n}/prompts/#{prompt_uuid}"]
        new_option = if option["code"] != nil do
          prompt_code = if is_list(Enum.at(option["code"], 0)) do
            option["code"]
          else
            [option["code"]]
          end
          put_in(option, ["code"], [multi_var_command] ++ prompt_code ++ [unset_command])
        else
          put_in(option, ["code"], unset_command)
        end
        acc ++ [new_option]
      end)
      new_prompt = put_in(new_prompt, ["options"], new_options)

      # Add the prompt to the player's prompts
      acc = put_in(acc, ["playerData", target_player_n, "prompts", prompt_uuid], new_prompt)
      put_in(acc, ["playerData", target_player_n, "mostRecentPromptId"], prompt_uuid)
    end)

    game
  end


  def dragn_prompt(prompt_id) do
    case prompt_id do
      "confirmAutomationYN" ->
        %{
          "args" => ["$MESSAGE", "$YES_CODE", "$NO_CODE"],
          "message" => "$MESSAGE",
          "options" => [
            %{
                "label" => "id:yes",
                "hotkey" => "Y",
                "code" => ["ACTION_LIST", "$YES_CODE"]
            },
            %{
                "label" => "id:no",
                "hotkey" => "N",
            }
          ]
        }
      "confirmAutomationAYNN" ->
        %{
          "args" => ["$MESSAGE", "$ALWAYS_CODE", "$YES_CODE", "$NO_CODE", "$NEVER_CODE"],
          "message" => "$MESSAGE",
          "options" => [
            %{
                "label" => "id:always",
                "hotkey" => "Shift+Y",
                "code" => ["ACTION_LIST", "$ALWAYS_CODE"]
            },
            %{
                "label" => "id:yes",
                "hotkey" => "Y",
                "code" => ["ACTION_LIST", "$YES_CODE"]
            },
            %{
                "label" => "id:no",
                "hotkey" => "N",
            },
            %{
                "label" => "id:never",
                "hotkey" => "Shift+N",
                "code" => ["ACTION_LIST", "$NEVER_CODE"]
            }
          ]
        }
      _ ->
        nil
    end
  end

end
