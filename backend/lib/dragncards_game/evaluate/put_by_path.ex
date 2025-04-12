defmodule DragnCardsGame.PutByPath do
  @moduledoc """
  Module that defines and evaluates the LISP-like language used to modify the game state.
  """
  require Logger
  alias DragnCardsGame.{GameUI, AutomationRules, RuleMap}
  alias DragnCards.{Rooms, Plugins}

  def put_by_path(game_old, path, val_new, trace) do
    IO.puts("put_by_path #{inspect(path)} #{inspect(val_new)}")
    # Get current time in ms
    t0 = System.system_time(:millisecond)
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
            # Check if val_old is a map
            if is_map(val_old) do
              #IO.puts("Changing #{inspect(path)} from #{inspect(val_old[key])} to #{inspect(val_new)}")
              put_in(game_old, path, val_new)
            else
              raise("Tried to set a key (#{key}) at a path that does not point to a map: #{inspect(path_minus_key)} = #{inspect(val_old)}")
            end
        end
      end

    if is_map(game_new["ruleMap"]) and game_new["automationEnabled"] == true do
      AutomationRules.apply_automation_rules_for_update_paths(game_new, game_old, [path], path, trace ++ ["apply_automation_rules_for_update_paths"])
    else
      game_new
    end
    t1 = System.system_time(:millisecond)
    IO.puts("put_by_path time: #{t1 - t0} ms")
    game_new
  end

end
