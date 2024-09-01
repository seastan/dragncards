defmodule DragnCardsGame.Evaluate do
  @moduledoc """
  Module that defines and evaluates the LISP-like language used to modify the game state.
  """
  require Logger
  alias DragnCardsGame.{GameUI}
  alias DragnCards.{Rooms, Plugins}


  def put_by_path(game_old, path, val_new, trace) do
    #if Enum.member?(path, "arkhamEventCustomBeforeDraw") do
      # IO.puts("val_new 1")
      # IO.inspect(path)
      # IO.inspect(val_new)
      # IO.puts("val_new 2")
    #end
    path_minus_key = try do
      Enum.slice(path, 0, Enum.count(path)-1)
    rescue
      _ ->
        raise "Tried to set a value (#{val_new}) at a nonexistent path: #{inspect(path)}."
    end
    key = Enum.at(path, -1)
    # IO.puts("path_minus_key 1")
    # IO.inspect(path_minus_key)
    # IO.puts("put_by_keys 1")
    # IO.inspect(Map.keys(game_old))
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
              put_in(game_old, path, val_new)
            else
              raise("Tried to set a key (#{key}) at a path that does not point to a map: #{inspect(path_minus_key)} = #{inspect(val_old)}")
            end
        end
      end

      if is_map(game_new["automation"]) and game_new["automationEnabled"] == true do
        Enum.reduce(game_new["automation"], game_new, fn({id, automation}, acc) ->
          apply_automation_rules(automation, path, game_old, acc, trace ++ ["apply_automation_rules", id])
        end)
      else
        game_new
      end
  end

  def apply_automation_rules(automation, path, game_old, game_new, trace) do

    # Save current values of THIS and TARGET
    prev_this_id = evaluate(game_new, "$THIS_ID", trace ++ ["$THIS_ID"])
    prev_this = evaluate(game_new, "$THIS", trace ++ ["$THIS"])
    prev_target_id = evaluate(game_new, "$TARGET_ID", trace ++ ["$TARGET_ID"])
    prev_target = evaluate(game_new, "$TARGET", trace ++ ["$TARGET"])

    game_new =
      if automation["this_id"] do
        game_new |>
        evaluate(["DEFINE", "$THIS_ID", automation["this_id"]], trace ++ ["game_new"]) |>
        evaluate(["DEFINE", "$THIS", "$GAME.cardById.$THIS_ID"], trace ++ ["game_new"])
      else
        game_new
      end
    game_old =
      if automation["this_id"] do
        game_old |>
        evaluate(["DEFINE", "$THIS_ID", automation["this_id"]], trace ++ ["game_old"]) |>
        evaluate(["DEFINE", "$THIS", "$GAME.cardById.$THIS_ID"], trace ++ ["game_old"])
      else
        game_old
      end
    game_new =
      if Enum.count(path) > 2 do
        game_new |>
        evaluate(["DEFINE", "$TARGET_ID", Enum.at(path,1)], trace ++ ["game_new"]) |>
        evaluate(["DEFINE", "$TARGET", "$GAME."<>Enum.at(path,0)<>".$TARGET_ID"], trace ++ ["game_new"])
      else
        game_new
      end
    game_old =
      if Enum.count(path) > 2 do
        game_old |>
        evaluate(["DEFINE", "$TARGET_ID", Enum.at(path,1)], trace ++ ["game_old"]) |>
        evaluate(["DEFINE", "$TARGET", "$GAME."<>Enum.at(path,0)<>".$TARGET_ID"], trace ++ ["game_old"])
      else
        game_old
      end
    game_new = Enum.reduce(automation["rules"], game_new, fn(rule, acc)->
      #IO.puts("applying rule")
      #IO.inspect(rule)
      apply_automation_rule(rule, path, game_old, acc, trace)
    end)

    # Restore THIS and TARGET
    game_new |>
      evaluate(["DEFINE", "$THIS_ID", prev_this_id], trace ++ ["restore"]) |>
      evaluate(["DEFINE", "$THIS", prev_this], trace ++ ["restore"]) |>
      evaluate(["DEFINE", "$TARGET_ID", prev_target_id], trace ++ ["restore"]) |>
      evaluate(["DEFINE", "$TARGET", prev_target], trace ++ ["restore"])
  end

  def apply_automation_rule(rule, path, game_old, game_new, trace) do
    if path_matches_listenpaths?(path, rule["listenTo"], game_new, trace) do
      comment = rule["_comment"]
      case rule["type"] do
        "trigger" ->
          if Enum.member?(path, "arkhamEventCustomBeforeDraw") do
            IO.puts("apply_automation_rule 1 ===================================================================================================")
            IO.inspect(path)
            IO.puts("apply_automation_rule 2 =======================================================================================================================")
          end
          apply_trigger_rule(rule, game_old, game_new, trace ++ ["apply_trigger_rule #{comment}"])
        "passive" ->
          apply_passive_rule(rule, game_old, game_new, trace ++ ["apply_passive_rule #{comment}"])
        _ ->
          game_new
      end
    else
      game_new
    end
  end

  def apply_trigger_rule(rule, game_old, game_new, trace) do
    # Stringify the rule
    game_new = put_in(game_new["prev_game"], game_old)
    game_new = if evaluate(game_new, rule["condition"], trace ++ [Jason.encode!(rule["condition"])]) do
      evaluate(game_new, rule["then"], trace ++ [Jason.encode!("THEN")])
    else
      game_new
    end
    put_in(game_new["prev_game"], nil)
  end

  def apply_passive_rule(rule, game_old, game_new, trace) do
    onBefore = evaluate(game_old, rule["condition"], trace ++ ["game_old", Jason.encode!(rule["condition"])])
    onAfter = evaluate(game_new, rule["condition"], trace ++ ["game_new", Jason.encode!(rule["condition"])])

    cond do
      !onBefore && onAfter ->
        evaluate(game_new, rule["onDo"], trace ++ ["ON_DO"])
      onBefore && !onAfter ->
        evaluate(game_new, rule["offDo"], trace ++ ["OFF_DO"])
      true ->
        game_new
    end
  end

  def path_matches_listenpaths?(path, listenpaths, game_new, trace) do
    if Enum.any?(listenpaths, fn(listenpath) -> path_matches_listenpath?(path, listenpath, game_new, trace ++ ["path_matches_listenpath", Jason.encode!(listenpath)]) end) do
      true
    else
      false
    end
  end

  def path_matches_listenpath?(path, listenpath, game_new, trace) do

    # Process listenpath into a list
    listenpath = evaluate(game_new, listenpath, trace ++ ["path_matches_listenpath"])

    # Check if each element in path and listenpath match or if listenpath element is a wildcard
    Enum.count(path) == Enum.count(listenpath)
    && Enum.zip(path, listenpath)
    |> Enum.all?(fn {x, y} -> evaluate(game_new, x, trace) == evaluate(game_new, y, trace) || y == "*" end)
  end

  def message_list_to_string(game, statements, trace) do
    Enum.reduce(Enum.with_index(statements), "", fn({statement, index}, acc) ->
      eval_statement = evaluate(game, statement, trace ++ ["statement #{index}"])
      # if eval_statement is not a string, convert it to a string
      eval_statement = if is_binary(eval_statement) do
        eval_statement
      else
        inspect(eval_statement)
      end
      acc <> eval_statement
    end)
  end

  @spec convert_to_integer(String.t() | nil) :: number
  def convert_to_integer(my_string) do
    if my_string == nil do
      nil
    else
      result = Integer.parse("#{my_string}")
      case result do
        {number, _} -> number
        :error -> 0
      end
    end
  end

  def while_loop(game, condition, action_list, trace, index) do
    if evaluate(game, condition, trace ++ ["WHILE condition"]) == true do
      game = evaluate(game, action_list, trace ++ ["WHILE index #{index}"])
      while_loop(game, condition, action_list, trace, index + 1)
    else
      game
    end
  end

  def card_match?(game, var_name, card, condition, trace) do
    game = evaluate(game, ["VAR", var_name, card], trace ++ ["VAR var_name"])
    evaluate(game, condition, trace ++ ["card_match?"])
  end

  @spec find_var(String.t(), integer(), map()) :: {:found, any()} | {:not_found, nil}
  def find_var(key, start_integer, input_map) do
    #IO.puts("Searching for var #{key} in #{inspect(input_map)}")
    1..start_integer
    |> Enum.reverse()
    |> Enum.reduce_while(nil, fn i, _acc ->
      case Map.fetch(input_map["#{i}"], key) do
        :error -> {:cont, {false, nil}}
        {:ok, value} ->
          {:halt, {true, value}}
      end
    end)
    |> case do
      {false, nil} -> # Not in local scopes, check global scope
        case Map.fetch(input_map, key) do
          :error -> {false, nil}
          {:ok, value} ->
            {true, value}
        end
      found -> found # Found in local scopes
    end
  end

  def find_var_scope_index(key, start_integer, input_map) do
    #IO.puts("Searching for var #{key} in #{inspect(input_map)}")
    1..start_integer
    |> Enum.reverse()
    |> Enum.reduce_while(nil, fn i, _acc ->
      case Map.fetch(input_map["#{i}"], key) do
        :error -> {:cont, {false, nil}}
        {:ok, _} -> {:halt, i}
      end
    end)
    |> case do
      {false, nil} -> # Not in local scopes, check global scope
        raise "Tried to access variable #{key} but it was not found in any scope."
      found -> found # Found in local scopes
    end
  end

  def get_lhs_rhs(game, code, trace) do
    lhs = evaluate(game, Enum.at(code,1), trace ++ ["evaluate lhs"]) || 0
    rhs = evaluate(game, Enum.at(code,2), trace ++ ["evaluate rhs"]) || 0
    # If lhs or rhs is not a number, raise an error
    if is_number(lhs) and is_number(rhs) do
      {lhs, rhs}
    else
      raise "Tried to compare #{inspect(lhs)} and #{inspect(rhs)} but one of them is not a number."
    end
  end

  def evaluate_with_timeout(game, code, timeout_ms \\ 35_000) do
    trace = [code]
    task = Task.async(fn ->
      try do
        evaluate(game, code, trace)
      rescue
        e ->
          evaluate(game, ["ERROR", e.message], trace)
      end
    end)

    case Task.yield(task, timeout_ms) do
      nil ->
        Task.shutdown(task, :brutal_kill)
        evaluate(game, ["ERROR", "Action timed out. #{inspect(trace)}"], trace)
      {:ok, result} ->
        result
    end
  end

  defmodule RecursiveEvaluationError do
    defexception message: "Default message", code: nil, trace: []
  end

  def evaluate(game, code, trace \\ []) do
    # if is_list(code) do
    #   IO.puts("evaluate 1")
    #   IO.inspect(code)
    #   IO.puts("evaluate 2")
    #   #IO.inspect(game)
    #   IO.puts("evaluate 3")
    # end
    try do
      # Increase scope index
      current_scope_index = game["currentScopeIndex"] + 1
      game = put_in(game, ["currentScopeIndex"], current_scope_index)
      game = if not Map.has_key?(game["variables"], "#{current_scope_index}") do
        put_in(game, ["variables", "#{current_scope_index}"], %{})
      else
        game
      end

      # Evaluate the code
      result = evaluate_inner(game, code, trace)

      # Delete local variables
      if is_map(result) and Map.has_key?(result, "variables") do
        result = if Map.has_key?(result["variables"], "#{current_scope_index+1}") do
          put_in(result, ["variables"], Map.delete(result["variables"], "#{current_scope_index+1}"))
        else
          result
        end
        # Decrease scope index
        put_in(result, ["currentScopeIndex"], current_scope_index - 1)
      else
        result
      end

    rescue
      e in RecursiveEvaluationError ->
        raise RecursiveEvaluationError, message: e.message
      e ->
        # Check if e has a message
        message = if is_map(e) and Map.has_key?(e, :message) do
          e.message
        else
          inspect(e)
        end
        if String.starts_with?(message, "ABORT") do
          raise RecursiveEvaluationError, message: message
        else
          raise RecursiveEvaluationError, message: ": #{message} Trace: #{inspect(trace)}"
        end
    end
  end


  def evaluate_inner(game, code, trace) do
    #IO.puts("evaluate_inner 1")
    #IO.inspect(code)
    current_scope_index = game["currentScopeIndex"]


    if is_list(code) && Enum.count(code) > 0 do

      if is_list(Enum.at(code, 0)) do
        # Nested actionList
        # Update currentScopeIndex

        Enum.reduce(Enum.with_index(code), game, fn({action, index}, acc) ->
          evaluate(acc, action, trace ++ ["index #{index}"])
        end)

      else
        #
        # IO.puts("evaluate_inner 2")
        # IO.inspect(code)
        function_name = Enum.at(code, 0)
        trace = trace ++ [function_name]

        function_module = try do
          String.to_existing_atom("Elixir.DragnCardsGame.Evaluate.Functions." <> String.upcase(function_name))
        rescue
          _->
            nil
        end

        if function_module != nil do
          apply(function_module, String.to_atom("execute"), [game, code, trace])
        else
          # Check if function_name is in game["functions"]
          if Map.has_key?(game["functions"], function_name) do
            # Get the function
            func = game["functions"][function_name]
            func_args = func["args"]
            func_code = func["code"]
            # get input args
            input_args = Enum.slice(code, 1, Enum.count(code))

            # Make sure the number of input args is not greater than the number of function args
            if Enum.count(input_args) > Enum.count(func_args) do
              raise "Function #{function_name} expects #{Enum.count(func_args)} arguments, but got #{Enum.count(input_args)}."
            end
            # Call VAR on each of the function args
            multi_var_command = Enum.reduce(Enum.with_index(func_args), ["MULTI_VAR"], fn({func_arg, index}, acc) ->
              [{func_arg_name, input_arg}] = cond do
                index >= Enum.count(input_args) -> # If we are beyond the range of input arguments, look for default arguments
                  if is_map(func_arg) do
                    Map.to_list(func_arg)
                  else
                    raise "Function #{function_name} expects #{Enum.count(func_args)} arguments, but got #{Enum.count(input_args)}."
                  end
                true -> # We are within the range of input arguments, so use the input argument
                  input_arg = Enum.at(input_args, index)
                  if is_map(func_arg) do
                    func_arg_name = Enum.at(Map.keys(func_arg), 0)
                    [{func_arg_name, input_arg}]
                  else
                    func_arg_name = func_arg
                    [{func_arg_name, input_arg}]
                  end
              end
              acc ++ [func_arg_name, input_arg]
              #evaluate(acc, ["VAR", func_arg_name, input_arg], trace ++ ["function arg #{func_arg_name}"])
            end)
            game = evaluate(game, multi_var_command, trace ++ ["define function args"])
            # Evaluate the function
            evaluate(game, func_code, trace)

          else
            raise "Function #{inspect(Enum.at(code,0))} not recognized in #{inspect(code)}"
          end
        end
      end
    else # not a list
      trace = trace ++ [code]

      # Replace {{}} in strings with evaluated code
      code = if is_binary(code) do
        Regex.replace(~r/\{\{(.+?)\}\}/, code, fn _, match ->
          replacement = evaluate(game, match, trace ++ ["{{}}"])
          if is_list(replacement) or is_map(replacement) do
            inspect(replacement)
          else
            to_string(replacement)
          end
        end)
      else
        code
      end

      # variable
      cond do
        # It's a variable that is being deeply accessed, split it up and evaluate the path by parts
        is_binary(code) and String.starts_with?(code, "$") and String.contains?(code, ".") ->
          split = String.split(code, ".")
          obj = Enum.at(split, 0)
          path = ["LIST"] ++ Enum.slice(split, 1, Enum.count(split))
          evaluate(game, ["OBJ_GET_BY_PATH", obj, path], trace)

        # It's a regular variable
        is_binary(code) and String.starts_with?(code, "$") ->
          var_name = code
          {var_defined, var_value} = find_var(var_name, current_scope_index, game["variables"])
          if var_defined do
            var_value
          else
            variable_module = try do
              String.to_existing_atom("Elixir.DragnCardsGame.Evaluate.Variables." <> String.trim(String.upcase(var_name), "$"))
            rescue
              _->
                nil
            end

            if variable_module != nil do
              apply(variable_module, String.to_atom("execute"), [game, trace])
            else
              IO.puts("Variable #{var_name} not found in #{inspect(game["variables"])}")
              case var_name do

                "$PLAYER_ORDER" ->
                  # Call evaluate(game, ["NEXT_PLAYER", acc]) numPlayers times, starting with the current player, and put the results in a list
                  num_players = game["numPlayers"]
                  first_player = game["firstPlayer"]
                  {player_order, _} = Enum.reduce(0..num_players-1, {[], first_player}, fn _, {acc, player_i} ->
                    next_player = evaluate(game, ["NEXT_PLAYER", player_i], trace ++ ["$PLAYER_ORDER"])
                    {acc ++ [player_i], next_player}
                  end)
                  player_order

                "$GAME" ->
                  game

                "$GROUP_BY_ID" ->
                  game["groupById"]

                "$STACK_BY_ID" ->
                  game["stackById"]

                "$CARD_BY_ID" ->
                  game["cardById"]

                "$PLAYER_DATA" ->
                  game["playerData"]

                "$ACTIVE_CARD" ->
                  evaluate(game, "$GAME.cardById.$ACTIVE_CARD_ID", trace)

                "$ACTIVE_CARD_ID" ->
                  if game["playerUi"]["activeCardId"] == nil do
                    raise "Variable $ACTIVE_CARD_ID is undefined."
                  else
                    game["playerUi"]["activeCardId"]
                  end

                "$ACTIVE_FACE" ->
                  evaluate(game, "$ACTIVE_CARD.currentFace", trace)

                "$ACTIVE_TOKENS" ->
                  evaluate(game, "$ACTIVE_CARD.tokens", trace)

                "$ACTIVE_GROUP" ->
                  evaluate(game, "$GAME.groupById.$ACTIVE_GROUP_ID", trace ++ ["$ACTIVE_GROUP"])

                "$ACTIVE_GROUP_ID" ->
                  cond do
                    get_in(game, ["playerUi", "dropdownMenu", "group"]) ->
                      get_in(game, ["playerUi", "dropdownMenu", "group"])["id"]
                    get_in(game, ["playerUi", "activeCardId"]) ->
                      evaluate(game, "$ACTIVE_CARD.groupId", trace ++ ["$ACTIVE_GROUP"])
                    true ->
                      raise "Variable $ACTIVE_GROUP_ID is undefined."
                  end

                _ ->
                  raise "Variable #{code} is undefined."
              end
            end
          end

        is_binary(code) and String.starts_with?(code, "/") ->
          split = String.split(code, "/")
          path = ["LIST"] ++ Enum.slice(split, 1, Enum.count(split))
          List.flatten(evaluate(game, path, trace))

        true ->
          code
      end
    end
  end
end
