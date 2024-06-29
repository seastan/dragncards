defmodule DragnCardsGame.Evaluate.Functions.ACTION_LIST do
  alias DragnCardsGame.Evaluate
  alias DragnCards.Plugins
  @moduledoc """
  *Arguments*:
  1. `actionListId` (string) or `actionList` (DragnLang code)

  If provided a string, gets the DragnLang code from `gameDef.actionLists`. Then evaluates that code.

  *Returns*:
  (any) The result of the DragnLang code.
  """

  @doc """
  Executes the 'ACTION_LIST' operation with the given arguments.

  ## Parameters

    - `args`: The arguments required for the 'ACTION_LIST' operation.

  ## Returns

  The result of the 'ACTION_LIST' operation.
  """
  def get_action_list_from_game_def(plugin_id, action_list_id) do
    game_def = Plugins.get_game_def(plugin_id)
    action_list = game_def["actionLists"][action_list_id]
    if action_list == nil do
      raise("Could not find action list with id: #{inspect(action_list_id)} in game definition.")
    end
  end

  def execute(game, code, trace) do
     action_list_or_id = Enum.at(code, 1)

    # Set the load_list_id
    action_list = cond do
      is_list(action_list_or_id) ->
        action_list_or_id
      String.starts_with?(action_list_or_id, "$") ->
        res = Evaluate.evaluate_inner(game, action_list_or_id, trace ++ ["variable"])
        cond do
          is_list(res) ->
            res
          true ->
            get_action_list_from_game_def(game["options"]["pluginId"], res)
        end
      true ->
        get_action_list_from_game_def(game["options"]["pluginId"], action_list_or_id)
    end
    Evaluate.evaluate(game, action_list, trace)

  end


end
