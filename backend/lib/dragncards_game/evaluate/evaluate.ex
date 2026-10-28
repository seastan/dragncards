defmodule DragnCardsGame.Evaluate do
  @moduledoc """
  Module that defines and evaluates the LISP-like language used to modify the game state.
  """
  require Logger
  alias DragnCardsGame.{GameUI, AutomationRules, RuleMap}
  alias DragnCards.{Rooms, Plugins}

  def print_card_status(game) do
    IO.puts("Card status:")
    Enum.reduce(game["cardById"], nil, fn {card_id, card}, _acc ->
      IO.puts('Card #{card["sides"]["A"]["name"]}: #{card["inPlay"]}')
    end)
  end

  def message_list_to_string(game, statements, trace) do
    Enum.reduce(Enum.with_index(statements), "", fn({statement, index}, acc) ->
      eval_statement = evaluate(game, statement, [{"statement", index} | trace])
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
    if evaluate(game, condition, ["WHILE condition" | trace]) == true do
      game = evaluate(game, action_list, ["WHILE index #{index}" | trace])
      while_loop(game, condition, action_list, trace, index + 1)
    else
      game
    end
  end

  @doc """
  Returns argument `i` of a code list (`code` includes the function name at
  index 0), or nil past the end, exactly like `Enum.at/2` but without its
  generic slicing overhead.
  """
  def arg([a | _], 0), do: a
  def arg([_, a | _], 1), do: a
  def arg([_, _, a | _], 2), do: a
  def arg([_, _, _, a | _], 3), do: a
  def arg([_, _, _, _, a | _], 4), do: a
  def arg([_, _, _, _, _, a | _], 5), do: a
  def arg(code, i), do: Enum.at(code, i)

  def argc(code, expected_argc) do
    argc = Enum.count(code)-1
    if argc != expected_argc do
      raise "#{Enum.at(code,0)} expected #{expected_argc} arguments, but got #{Enum.count(code)-1}."
    end
    argc
  end

  def argc(code, min_expected_argc, nil) do
    argc = Enum.count(code)-1
    if argc < min_expected_argc do
      raise "#{Enum.at(code,0)} expected at least #{min_expected_argc} arguments, but got #{Enum.count(code)-1}."
    end
    argc
  end

  def argc(code, min_expected_argc, max_expected_argc) do
    argc = Enum.count(code)-1
    if argc < min_expected_argc or argc > max_expected_argc do
      raise "#{Enum.at(code,0)} expected between #{min_expected_argc} and #{max_expected_argc} arguments, but got #{Enum.count(code)-1}."
    end
    argc
  end

  def argt(func_name, argi, arg_type, val) do
    match = cond do
      arg_type == "variable" and is_binary(val) and String.starts_with?(val, "$") -> true
      arg_type == "string" and is_binary(val) -> true
      arg_type == "number" and is_number(val) -> true
      arg_type == "boolean" and is_boolean(val) -> true
      arg_type == "list" and is_list(val) -> true
      arg_type == "map" and is_map(val) and !is_struct(val, MapSet) -> true
      arg_type == "set" and is_struct(val, MapSet) -> true
      arg_type == "code" and is_list(val) -> true
      true -> false
    end
    if !match do
      raise "#{func_name}: Expected arg #{argi} to be of type #{arg_type} but got #{inspect(val)}."
    end
  end

  def card_match?(game, var_name, card, condition, trace) do
    game = evaluate(game, ["VAR", var_name, card], ["VAR var_name" | trace])
    evaluate(game, condition, ["card_match?" | trace])
  end

  # Local scopes live in game["variables"] under stringified scope indexes.
  # Precompute the strings for the depths we see in practice.
  for i <- 0..512 do
    def scope_key(unquote(i)), do: unquote(Integer.to_string(i))
  end
  def scope_key(i), do: Integer.to_string(i)

  @doc """
  Sets `var_name` in local scope `scope_index`. Same result as
  `put_in(game, ["variables", "\#{scope_index}", var_name], value)`.
  """
  def put_scoped_var(game, scope_index, var_name, value) do
    key = if is_integer(scope_index), do: scope_key(scope_index), else: "#{scope_index}"

    case game do
      %{"variables" => %{^key => scope} = vars} when is_map(scope) and not is_struct(scope) and not is_struct(vars) and not is_struct(game) ->
        Map.put(game, "variables", Map.put(vars, key, Map.put(scope, var_name, value)))

      _ ->
        put_in(game, ["variables", key, var_name], value)
    end
  end

  @spec find_var(String.t(), integer(), map()) :: {boolean(), any()}
  def find_var(key, start_integer, input_map) when start_integer >= 1 do
    find_var_local(key, start_integer, input_map)
  end

  def find_var(key, start_integer, input_map) do
    # 1..start_integer counts down through 0 here, and scope "0" never exists,
    # so this raises just as it always has.
    Enum.each(Enum.reverse(1..start_integer), fn i -> Map.fetch(input_map[scope_key(i)], key) end)
    raise "unreachable"
  end

  defp find_var_local(key, 0, input_map) do
    # Not in local scopes, check global scope
    case Map.fetch(input_map, key) do
      :error -> {false, nil}
      {:ok, value} -> {true, value}
    end
  end

  defp find_var_local(key, i, input_map) do
    case Map.fetch(Map.get(input_map, scope_key(i)), key) do
      :error -> find_var_local(key, i - 1, input_map)
      {:ok, value} -> {true, value}
    end
  end

  def find_var_scope_index(key, start_integer, input_map) when start_integer >= 1 do
    find_var_scope_index_local(key, start_integer, input_map)
  end

  def find_var_scope_index(key, start_integer, input_map) do
    Enum.each(Enum.reverse(1..start_integer), fn i -> Map.fetch(input_map[scope_key(i)], key) end)
    raise "unreachable"
  end

  defp find_var_scope_index_local(key, 0, _input_map) do
    raise "Tried to access variable #{key} but it was not found in any scope."
  end

  defp find_var_scope_index_local(key, i, input_map) do
    case Map.fetch(Map.get(input_map, scope_key(i)), key) do
      :error -> find_var_scope_index_local(key, i - 1, input_map)
      {:ok, _} -> i
    end
  end

  def get_lhs_rhs(game, code, trace) do
    lhs = evaluate(game, arg(code, 1), ["evaluate lhs" | trace]) || 0
    rhs = evaluate(game, arg(code, 2), ["evaluate rhs" | trace]) || 0
    # If lhs or rhs is not a number, raise an error
    if is_number(lhs) and is_number(rhs) do
      {lhs, rhs}
    else
      raise "Tried to compare #{inspect(lhs)} and #{inspect(rhs)} but one of them is not a number."
    end
  end

  @deadline_key {__MODULE__, :deadline}

  @doc """
  Evaluates `code`, turning errors into an in-game error message. Gives up
  after `timeout_ms`, returning the original game with a timeout message.

  The evaluation runs in the calling process (running it in a Task copied the
  whole game to another process and back on every action). The time limit is
  enforced by evaluate_full/3, which checks the deadline on each call.
  """
  def evaluate_with_timeout(game, code, description \\ nil, timeout_ms \\ 35_000) do
    trace = [description]
    previous_deadline = Process.get(@deadline_key)
    deadline = System.monotonic_time(:millisecond) + timeout_ms
    Process.put(@deadline_key, if(previous_deadline, do: min(previous_deadline, deadline), else: deadline))

    outcome =
      try do
        game = put_in(game, ["currentScopeIndex"], 0)
        {:ok, evaluate(game, code, trace)}
      rescue
        e -> {:error, Exception.message(e)}
      catch
        :throw, {@deadline_key, stuck_at} -> {:error, ": Action timed out." <> trace_suffix(stuck_at)}
      after
        if previous_deadline, do: Process.put(@deadline_key, previous_deadline), else: Process.delete(@deadline_key)
      end

    case outcome do
      {:ok, result} -> result
      {:error, message} -> evaluate(game, ["ERROR", message], trace)
    end
  end

  defp check_deadline(code, trace) do
    case Process.get(@deadline_key) do
      nil -> :ok
      deadline ->
        if System.monotonic_time(:millisecond) > deadline do
          # A throw, so that functions which rescue errors cannot swallow it.
          throw({@deadline_key, [trace_leaf(code) | trace]})
        end
    end
  end

  defmodule RecursiveEvaluationError do
    # `message` is the full text shown to users. `inner_message` is the
    # original error and `trace` the call path (outermost first).
    defexception message: "Default message", code: nil, trace: [], inner_message: nil
  end

  # Traces are built innermost-first (prepending is O(1) per call); they are
  # only turned into text when something goes wrong.
  @max_trace_entries 40

  @doc "Formats a trace (innermost-first list) as `outer > ... > inner`."
  def format_trace(trace) when is_list(trace) do
    entries =
      trace
      |> Enum.reverse()
      |> Enum.reject(&(&1 in [nil, ""]))
      |> Enum.map(&format_trace_entry/1)

    entries =
      if length(entries) > @max_trace_entries do
        Enum.take(entries, 5) ++ ["..."] ++ Enum.take(entries, 6 - @max_trace_entries)
      else
        entries
      end

    Enum.join(entries, " > ")
  end

  def format_trace(trace), do: inspect(trace)

  defp format_trace_entry(entry) when is_binary(entry), do: entry
  # Labels like {"index", 3} are only formatted when an error is reported.
  defp format_trace_entry({label, value}) when is_binary(label), do: label <> " " <> format_trace_value(value)
  defp format_trace_entry({label, value, suffix}) when is_binary(label) and is_binary(suffix),
    do: label <> " " <> format_trace_value(value) <> " " <> suffix
  defp format_trace_entry(entry), do: inspect(entry, limit: 5, printable_limit: 60)

  defp format_trace_value(value) when is_binary(value), do: value
  defp format_trace_value(value), do: inspect(value, limit: 5, printable_limit: 60)

  defp trace_suffix(trace) do
    case format_trace(trace) do
      "" -> ""
      text -> " | Trace: " <> text
    end
  end

  # What the failing code was, to end the trace with (e.g. the function name).
  defp trace_leaf([name | _]) when is_binary(name), do: name
  defp trace_leaf("$" <> _ = var), do: var
  defp trace_leaf(_), do: nil

  @doc """
  The text of an error for embedding in another error message: interpreter
  errors without their leading ": ", anything else via Exception.message/1.
  """
  def error_text(%RecursiveEvaluationError{message: ": " <> message}), do: message
  def error_text(e), do: Exception.message(e)

  def is_game(val) do
    is_map(val) and !is_struct(val, MapSet) and Map.has_key?(val, "roomSlug") and Map.has_key?(val, "pluginId") and Map.has_key?(val, "groupById") and Map.has_key?(val, "playerData") and Map.has_key?(val, "cardById")
  end

  # Values that evaluate to themselves. Evaluating one never touches the game,
  # so skip the scope bookkeeping entirely.
  defguardp is_self_evaluating(code)
            when is_number(code) or is_boolean(code) or is_nil(code)

  # Evaluating anything against a non-map "game" raises in evaluate_full, so
  # the fast paths only apply to real game maps.
  defguardp is_plain_map(game) when is_map(game) and not is_struct(game)

  def evaluate(game, code, trace \\ [])

  def evaluate(game, code, _trace) when is_self_evaluating(code) and is_plain_map(game), do: code

  def evaluate(game, [], _trace) when is_plain_map(game), do: []

  def evaluate(game, code, trace) when is_binary(code) and is_plain_map(game) do
    case code do
      <<c, _::binary>> when c == ?$ ->
        if template?(code), do: evaluate_full(game, code, trace), else: evaluate_variable(game, code, trace)

      <<c, _::binary>> when c == ?/ ->
        evaluate_full(game, code, trace)

      _ ->
        if template?(code), do: evaluate_full(game, code, trace), else: code
    end
  end

  def evaluate(game, code, trace) when is_plain_map(code) and is_plain_map(game) do
    if is_game(code), do: evaluate_full(game, code, trace), else: code
  end

  def evaluate(game, %MapSet{} = code, _trace) when is_plain_map(game), do: code

  def evaluate(game, code, trace), do: evaluate_full(game, code, trace)

  defp template?(code), do: :binary.match(code, "{{") != :nomatch

  # Variable lookups ("$X", "$X.a.b") without the scope bookkeeping. Any case
  # whose result could depend on that bookkeeping goes through evaluate_full.
  defp evaluate_variable(game, code, trace) do
    case fast_variable(game, code, trace) do
      {:ok, value} -> value
      :slow -> evaluate_full(game, code, trace)
    end
  end

  defp fast_variable(game, code, trace) do
    prev = Map.get(game, "currentScopeIndex") || 0
    vars = Map.get(game, "variables")

    # Lookups normally search scope prev+1 down to 1. The general path looks
    # up dotted paths a few scopes deeper, which only matters if those scopes
    # exist; let the general path handle that.
    if is_integer(prev) and prev >= 0 and is_plain_map(vars) and
         not Map.has_key?(vars, scope_key(prev + 2)) and
         not Map.has_key?(vars, scope_key(prev + 3)) and
         not Map.has_key?(vars, scope_key(prev + 4)) do
      try do
        case :binary.split(code, ".", [:global]) do
          [var_name] ->
            case lookup_variable(game, var_name, prev, vars, trace) do
              {:ok, value} -> if is_game(value), do: :slow, else: {:ok, value}
              :slow -> :slow
            end

          [obj_name | keys] ->
            fast_path_get(game, obj_name, keys, prev, vars, trace)
        end
      rescue
        _ -> :slow
      end
    else
      :slow
    end
  end

  # Mirrors the variable branch of evaluate_inner for a scope index of prev+1.
  defp lookup_variable(game, var_name, prev, vars, trace) do
    case fast_find_var(var_name, prev + 1, prev, vars) do
      {:found, value} ->
        {:ok, value}

      :slow ->
        :slow

      :not_found ->
        case variable_module(var_name) do
          nil ->
            :slow

          module ->
            # Built-in variables see the game as evaluate_full would hand it to them.
            {:ok, module.execute(enter_scope(game, prev + 1), [var_name | trace])}
        end
    end
  end

  # Like find_var, but treats scopes above `ensured` as present-but-empty when
  # missing (evaluate_full would have created them) and bails out to the slow
  # path wherever find_var would raise.
  defp fast_find_var(key, 0, _ensured, vars) do
    case vars do
      %{^key => value} -> {:found, value}
      _ -> :not_found
    end
  end

  defp fast_find_var(key, i, ensured, vars) do
    case Map.fetch(vars, scope_key(i)) do
      {:ok, scope} when is_map(scope) ->
        case scope do
          %{^key => value} -> {:found, value}
          _ -> fast_find_var(key, i - 1, ensured, vars)
        end

      :error when i > ensured ->
        fast_find_var(key, i - 1, ensured, vars)

      _ ->
        :slow
    end
  end

  @game_scope_keys ["variables", "currentScopeIndex"]

  # Mirrors ["OBJ_GET_BY_PATH", obj, ["LIST" | keys]] for a dotted variable.
  defp fast_path_get(game, obj_name, keys, prev, vars, trace) do
    obj =
      case fast_find_var(obj_name, prev + 1, prev, vars) do
        {:found, value} -> if is_game(value), do: :slow, else: {:ok, value}
        :slow -> :slow
        # The game itself; evaluate_full would only have changed its scope keys.
        :not_found when obj_name == "$GAME" -> {:ok, :__game__}
        :not_found -> :slow
      end

    with {:ok, map} <- obj,
         {:ok, path} <- fast_path_keys(game, keys, prev, vars, trace, []),
         false <- map == :__game__ and hd(path) in @game_scope_keys do
      map = if map == :__game__, do: game, else: map
      value = DragnCardsGame.Evaluate.Functions.OBJ_GET_BY_PATH.get_by_path(game, map, path, trace)
      if is_game(value), do: :slow, else: {:ok, value}
    else
      true -> :slow
      :slow -> :slow
    end
  end

  defp fast_path_keys(_game, [], _prev, _vars, _trace, acc), do: {:ok, Enum.reverse(acc)}

  defp fast_path_keys(game, [key | rest], prev, vars, trace, acc) do
    case key do
      <<c, _::binary>> when c == ?$ ->
        case lookup_variable(game, key, prev, vars, trace) do
          {:ok, value} ->
            if is_game(value), do: :slow, else: fast_path_keys(game, rest, prev, vars, trace, [value | acc])

          :slow ->
            :slow
        end

      <<c, _::binary>> when c == ?/ ->
        :slow

      _ ->
        fast_path_keys(game, rest, prev, vars, trace, [key | acc])
    end
  end

  defp enter_scope(game, current_scope_index) do
    vars = Map.get(game, "variables")
    key = scope_key(current_scope_index)

    if Map.has_key?(vars, key) do
      Map.put(game, "currentScopeIndex", current_scope_index)
    else
      game
      |> Map.put("currentScopeIndex", current_scope_index)
      |> Map.put("variables", Map.put(vars, key, %{}))
    end
  end

  defp exit_scope(result, current_scope_index) do
    vars = Map.get(result, "variables")
    child_key = scope_key(current_scope_index + 1)

    result =
      if Map.has_key?(vars, child_key) do
        Map.put(result, "variables", Map.delete(vars, child_key))
      else
        result
      end

    Map.put(result, "currentScopeIndex", current_scope_index - 1)
  end

  defp evaluate_full(game, code, trace) do
    check_deadline(code, trace)
    try do
      # Increase scope index
      prev_scope_index = game["currentScopeIndex"] || 0
      current_scope_index = prev_scope_index + 1
      game =
        if is_map(game) and not is_struct(game) and is_integer(current_scope_index) do
          enter_scope(game, current_scope_index)
        else
          game = put_in(game, ["currentScopeIndex"], current_scope_index)
          if not Map.has_key?(game["variables"], "#{current_scope_index}") do
            put_in(game, ["variables", "#{current_scope_index}"], %{})
          else
            game
          end
        end

      # Evaluate the code
      result = evaluate_inner(game, code, trace)

      # Delete local variables and decrease scope index
      if is_game(result) do
        exit_scope(result, current_scope_index)
      else
        result
      end

    rescue
      e in RecursiveEvaluationError ->
        reraise e, __STACKTRACE__
      e ->
        # Check if e has a message
        message = cond do
          is_map(e) and !is_struct(e, MapSet) and Map.has_key?(e, :message) -> e.message
          is_exception(e) -> Exception.message(e)
          true -> inspect(e)
        end
        cond do
          String.starts_with?(message, " ") ->
            raise RecursiveEvaluationError, message: message, inner_message: message
          # A function that wrapped an inner interpreter error already carries
          # that error's (longer) trace.
          String.contains?(message, " | Trace: ") ->
            raise RecursiveEvaluationError, message: ": " <> message, inner_message: message
          true ->
            # A dotted variable ("$CARD.id") is evaluated as OBJ_GET_BY_PATH;
            # the variable is already the last trace entry.
            leaf = case {trace_leaf(code), trace} do
              {"OBJ_GET_BY_PATH", ["$" <> _ | _]} -> nil
              {leaf, _} -> leaf
            end
            full_trace = [leaf | trace]
            raise RecursiveEvaluationError,
              message: ": " <> message <> trace_suffix(full_trace),
              inner_message: message,
              trace: Enum.reverse(full_trace)
        end
    end
  end

  @functions_prefix "Elixir.DragnCardsGame.Evaluate.Functions."
  @variables_prefix "Elixir.DragnCardsGame.Evaluate.Variables."

  # Name -> module maps for built-in functions and variables, built once from
  # the application's module list.
  defp builtin_modules do
    case :persistent_term.get({__MODULE__, :builtin_modules}, nil) do
      nil ->
        modules =
          case :application.get_key(:dragncards, :modules) do
            {:ok, modules} -> modules
            _ -> []
          end

        by_prefix = fn prefix ->
          for module <- modules,
              name = Atom.to_string(module),
              String.starts_with?(name, prefix),
              into: %{} do
            {String.replace_prefix(name, prefix, ""), module}
          end
        end

        builtins = %{functions: by_prefix.(@functions_prefix), variables: by_prefix.(@variables_prefix)}
        :persistent_term.put({__MODULE__, :builtin_modules}, builtins)
        builtins

      builtins ->
        builtins
    end
  end

  def function_module(function_name) when is_binary(function_name) do
    functions = builtin_modules().functions

    case functions do
      %{^function_name => module} -> module
      _ -> Map.get(functions, String.upcase(function_name)) || legacy_module(@functions_prefix <> String.upcase(function_name))
    end
  end

  def function_module(_function_name), do: nil

  def variable_module(var_name) when is_binary(var_name) do
    name = String.trim(String.upcase(var_name), "$")
    Map.get(builtin_modules().variables, name) || legacy_module(@variables_prefix <> name)
  end

  # Modules that are not in the application's module list (e.g. defined at
  # runtime in tests) are still found the old way.
  defp legacy_module(name) do
    try do
      String.to_existing_atom(name)
    rescue
      _ -> nil
    end
  end

  def evaluate_inner(game, code, trace) do
    # IO.puts("evaluate_inner 1")
    # IO.inspect(code)
    current_scope_index = Map.get(game, "currentScopeIndex")


    if is_list(code) and code != [] do

      if is_list(hd(code)) do
        # Nested actionList
        # Update currentScopeIndex

        Enum.reduce(Enum.with_index(code), game, fn({action, index}, acc) ->
          evaluate(acc, action, [{"index", index} | trace])
        end)

      else
        #
        # IO.puts("evaluate_inner 2")
        # IO.inspect(code)
        function_name = hd(code)
        # If function_name starts with a $, evaluate it
        function_name = if is_binary(function_name) and String.starts_with?(function_name, "$") do
          evaluate(game, function_name, ["function_name" | trace])
        else
          function_name
        end
        trace = [function_name | trace]

        # Check if function_name is in game["functions"]
        functions = Map.get(game, "functions")
        if Map.has_key?(functions, function_name) do
          # Get the function
          func = Map.get(functions, function_name)
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
                if is_map(func_arg) and !is_struct(func_arg, MapSet) do
                  Map.to_list(func_arg)
                else
                  raise "Function #{function_name} expects #{Enum.count(func_args)} arguments, but got #{Enum.count(input_args)}."
                end
              true -> # We are within the range of input arguments, so use the input argument
                input_arg = Enum.at(input_args, index)
                if is_map(func_arg) and !is_struct(func_arg, MapSet) do
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
          game = evaluate(game, multi_var_command, ["args" | trace])
          # Evaluate the function
          evaluate(game, func_code, trace)

        else # function_name is not in game["functions"], check if it's a built-in function
          function_module = function_module(function_name)

          if function_module != nil do
            function_module.execute(game, code, trace)
          else
            raise "Function #{inspect(function_name)} not recognized in #{inspect(code)}"
          end
        end

      end
    else # not a list
      trace = [code | trace]

      # Replace {{}} in strings with evaluated code
      code = if is_binary(code) and :binary.match(code, "{{") != :nomatch do
        Regex.replace(~r/\{\{(.+?)\}\}/, code, fn _, match ->
          replacement = evaluate(game, match, ["{{}}" | trace])
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
          {var_defined, var_value} = find_var(var_name, current_scope_index, Map.get(game, "variables"))
          if var_defined do
            var_value
          else
            variable_module = variable_module(var_name)

            if variable_module != nil do
              variable_module.execute(game, trace)
            else
              #IO.puts("Variable #{var_name} not found in #{inspect(game["variables"])}")
              case var_name do

                "$PLAYER_ORDER" ->
                  # Call evaluate(game, ["NEXT_PLAYER", acc]) numPlayers times, starting with the current player, and put the results in a list
                  num_players = game["numPlayers"]
                  first_player = game["firstPlayer"]
                  {player_order, _} = Enum.reduce(0..num_players-1, {[], first_player}, fn _, {acc, player_i} ->
                    next_player = evaluate(game, ["NEXT_PLAYER", player_i], ["$PLAYER_ORDER" | trace])
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

                "$ACTIVE_SIDE" ->
                  evaluate(game, "$ACTIVE_CARD.currentSide", trace)

                "$ACTIVE_TOKENS" ->
                  evaluate(game, "$ACTIVE_CARD.tokens", trace)

                "$ACTIVE_GROUP" ->
                  evaluate(game, "$GAME.groupById.$ACTIVE_GROUP_ID", ["$ACTIVE_GROUP" | trace])

                "$ACTIVE_GROUP_ID" ->
                  cond do
                    get_in(game, ["playerUi", "dropdownMenu", "group"]) ->
                      get_in(game, ["playerUi", "dropdownMenu", "group"])["id"]
                    get_in(game, ["playerUi", "activeCardId"]) ->
                      evaluate(game, "$ACTIVE_CARD.groupId", ["$ACTIVE_GROUP" | trace])
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
