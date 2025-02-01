defmodule MyTest do

  def multiple_map_changes(map, map_changes) do
    Enum.reduce(map_changes, map, fn(options, acc) ->
      change_map(acc, options)
    end)
  end

  def is_key_list(key_list) do
    is_list(key_list) and Enum.at(key_list, 0) == "keyList"
  end

  def get_nested_value(map, key_list) do
    if is_key_list(key_list) do
      get_in(map, get_path_from_key_list(map,key_list))
    else
      key_list
    end
  end

  def flatten_key_list(map, key_list) do
    Enum.reduce(key_list, [], fn(key, acc) ->
      acc ++ if is_list(key) do
        [get_nested_value(map, key)]
      else
        [key]
      end
    end)
  end

  def get_path_from_key_list(map, key_list) do
    flat_key_list = flatten_key_list(map, key_list)
    List.delete_at(flat_key_list, 0) # remove "keyList"
  end

  def evaluate_condition(map, condition) do
    # A condition is a list of 3 things. Value A, an operator, and value B
    _operators = ["and", "or", "==", ">", "<", "<=", ">=", "!=", "inString", "inList", "containsInString", "containsInList"]
    if Enum.count(condition) == 3 do
      lhs = Enum.at(condition, 0)
      operator = Enum.at(condition, 1)
      rhs = Enum.at(condition, 2)
      lhs = if Enum.member?(["and","or"], operator) do lhs else get_nested_value(map, lhs) end
      rhs = if Enum.member?(["and","or"], operator) do rhs else get_nested_value(map, rhs) end
      case operator do
        "==" ->
          lhs == rhs
        "!=" ->
          lhs != rhs
        ">" ->
          is_number(lhs) and is_number(rhs) and lhs > rhs
        "<" ->
          is_number(lhs) and is_number(rhs) and lhs < rhs
        ">=" ->
          is_number(lhs) and is_number(rhs) and lhs >= rhs
        "<=" ->
          is_number(lhs) and is_number(rhs) and lhs <= rhs
        "inString" ->
          is_binary(lhs) and is_binary(rhs) and String.contains?(rhs, lhs)
        "containsInString" ->
          is_binary(lhs) and is_binary(rhs) and String.contains?(lhs, rhs)
        "inList" ->
          is_list(rhs) and Enum.member?(rhs, lhs)
        "containsInList" ->
          is_list(lhs) and Enum.member?(lhs, rhs)
        "and" ->
          evaluate_condition(map, lhs) and evaluate_condition(map, rhs)
        "or" ->
          evaluate_condition(map, lhs) or evaluate_condition(map, rhs)
        _ ->
          False
      end
    else
      false
    end
  end

  def change_map(map, options) do
    action = options["action"]
    try do
      new_map = case action do
        "setValue" ->
          if Map.has_key?(options, "key_list") and Map.has_key?(options, "value") do
            path = get_path_from_key_list(map, options["key_list"])
            value = options["value"]
            put_in(map, path, value)
          else map end
        "increaseBy" ->
          if Map.has_key?(options, "key_list") and Map.has_key?(options, "value") do
            key_list = options["key_list"]
            path = get_path_from_key_list(map, key_list)
            old_value = get_nested_value(map, key_list)
            amount = options["value"]
            new_value = if is_number(old_value) and is_number(amount) do
              temp_value = old_value + amount
              if Map.has_key?(options, "max") and is_number(options["max"]) and temp_value > options["max"] do
                options["max"]
              else
                temp_value
              end
            else
              old_value
            end
            put_in(map, path, new_value)
          else map end
        "decreaseBy" ->
          if Map.has_key?(options, "key_list") and Map.has_key?(options, "value") do
            flat_key_list = flatten_key_list(map, options["key_list"])
            old_value = get_nested_value(map, flat_key_list)
            amount = options["value"]
            new_value = if is_number(old_value) and is_number(amount) do
              temp_value = old_value - amount
              if Map.has_key?(options, "min") and is_number(options["min"]) and temp_value < options["min"] do
                options["min"]
              else
                temp_value
              end
            else
              old_value
            end
            put_in(map, flat_key_list, new_value)
          else map end
        "cases" ->
          if Map.has_key?(options, "cases") do
            Enum.reduce_while(options["cases"], map, fn(casei, acc) ->
              if Map.has_key?(casei, "if") and Map.has_key?(casei, "then") do
                if evaluate_condition(acc, casei["if"]) do
                  {:halt, multiple_map_changes(acc, casei["then"])}
                else
                  {:cont, acc}
                end
              else
                {:cont, acc}
              end
            end)
          else map end
        "forEach" ->
          if Map.has_key?(options, "key_list") and Map.has_key?(options, "do") do
            maps = get_nested_value(map, options["key_list"])
            path = get_path_from_key_list(map, options["key_list"])
            for_each_action = options["do"]
            new_maps = Enum.reduce(Map.keys(maps), maps, fn(k, acc) ->
              put_in(acc[k], change_map(acc[k], for_each_action))
            end)
            put_in(map, path, new_maps)
          end
        _ ->
          map
      end
    rescue
      e ->
        IO.inspect(e)
    end
  end
end

gameui = %{
  "game" => %{
    "cardById" => %{
      "abc" => %{
        "exhausted" => True,
        "time" => 0
      },
      "def" => %{
        "exhausted" => True,
        "time" => 1
      },
      "ghi" => %{
        "exhausted" => False,
        "time" => 2
      }
    }
  },
  "playerUi" => %{
    "activeCardId" => "abc",
  }
}

action = "setValue"
key_list = ["keyList", "game", "cardById", ["keyList", "playerUi", "activeCardId"], "exhausted"]
value = False
options = %{
  "action" => action,
  "key_list" => key_list,
  "value" => value,
}

MyTest.change_map(gameui, options)

action = "increaseBy"
key_list = ["keyList", "game", "cardById", ["keyList", "playerUi", "activeCardId"], "time"]
options = %{
  "action" => action,
  "key_list" => key_list,
  "value" => 10/3
}

MyTest.change_map(gameui, options)

options2 = %{
  "action" => "condition",
  "if" => [[["keyList", "playerUi", "activeCardId"], "inString", "abdc"], "and", [["keyList", "playerUi", "activeCardId"], "inString", "abc"]],
  "then" => options
}


MyTest.change_map(gameui, options2)

options = %{
  "action" => "forEach",
  "key_list" => ["keyList", "game", "cardById","faf"],
  "do" => %{
    "action" => "condition",
    "if" => [["keyList", "exhausted"], "==", True],
    "then" => %{
      "action" => "increaseBy",
      "key_list" => ["keyList", "time"],
      "value" => 1
    }
  }
}
MyTest.change_map(gameui, options)

action = "increaseBy"
key_list = ["keyList", "game", "cardById", ["keyList", "playerUi", "activeCardId"], "time"]
options = %{
  "action" => action,
  "key_list" => key_list,
  "value" => 10/3
}

optionsb = %{
  "action" => "cases",
  "cases" => [
    %{
      "if" => [["keyList", "playerUi", "activeCardId"], "inString", "abc"],
      "then" => [
        options,
        options,
      ]
    },
    %{
      "if" => [["keyList", "playerUi", "activeCardId"], "inString", "abc"],
      "then" => [
        options,
        options,
      ]
    }
  ]
}
IO.puts("A")
newmap = MyTest.change_map(gameui, optionsb)
IO.inspect(newmap)
#IO.inspect(MyTest.evaluate_condition(gameui, [["keyList", "playerUi", "activeCardId", "two"], "inString", "abd"]))
IO.inspect(MyTest.var)
