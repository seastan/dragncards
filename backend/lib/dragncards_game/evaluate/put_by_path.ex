defmodule DragnCardsGame.PutByPath do
  @moduledoc """
  Module that defines and evaluates the LISP-like language used to modify the game state.
  """
  require Logger
  alias DragnCardsGame.{GameUI, AutomationRules, RuleMap}
  alias DragnCards.{Rooms, Plugins}

  def put_by_path(game_old, path, val_new, trace) do
    path_minus_key = try do
      Enum.slice(path, 0, Enum.count(path)-1)
    rescue
      _ ->
        raise "Tried to set a value (#{val_new}) at a nonexistent path: #{inspect(path)}."
    end
    key = Enum.at(path, -1)

    game_new =
      if path_minus_key == [] do
        put_in(game_old, path, val_new)
      else
        case get_in(game_old, path_minus_key) do
          nil ->
            if Enum.at(path_minus_key, 0) == "layoutVariants" do # legacy code
              game_old
            else
              raise "Tried to set a value (#{val_new}) at a nonexistent path: #{inspect(path_minus_key)}."
            end

          val_old ->
            if is_map(val_old) and !is_struct(val_old, MapSet) do
              # Skip the update entirely if the value hasn't changed — avoids
              # spurious automation rule evaluation on no-op SETs (e.g. bulk
              # flag resets where most cards already hold the target value).
              if val_old[key] === val_new do
                :unchanged
              else
                put_in(game_old, path, val_new)
              end
            else
              raise("Tried to set a key (#{key}) at a path that does not point to a map: #{inspect(path_minus_key)} = #{inspect(val_old)}")
            end
        end
      end

    if game_new == :unchanged do
      game_old
    else
      if is_map(game_new["ruleMap"]) and game_new["automationEnabled"] == true do
        AutomationRules.apply_automation_rules_for_update_paths(game_new, game_old, [path], path, trace ++ ["apply_automation_rules_for_update_paths"])
      else
        game_new
      end
    end
  end

end
