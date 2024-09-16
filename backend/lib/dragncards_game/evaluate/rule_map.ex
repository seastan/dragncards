defmodule DragnCardsGame.RuleMap do
  def add_to_rule_map(map, [], val) do
    update_map(map, val)
  end

  def add_to_rule_map(map, [key | rest], val) do
    nested_map = Map.get(map, key, %{})
    updated_nested_map = add_to_rule_map(nested_map, rest, val)
    Map.put(map, key, updated_nested_map)
  end

  defp update_map(map, val) do
    case get_in(map, ["_rule_ids"]) do
      nil -> Map.put(map, "_rule_ids", [val])
      list when is_list(list) -> put_in(map, ["_rule_ids"], [val | list])
      _ -> map
    end
  end

  def get_ids_by_path(map, []) do
    case get_in(map, ["_rule_ids"]) do
      nil -> []
      ids when is_list(ids) -> ids
      _ -> []
    end
  end

  def get_ids_by_path(map, [key | rest]) do
    map_at_key = Map.get(map, key, %{})
    map_at_wildcard = Map.get(map, "*", %{})
    get_ids_by_path(map_at_key, rest) ++ get_ids_by_path(map_at_wildcard, rest)
    |> Enum.uniq()
  end

  def get_ids_by_paths(paths, map) do
    Enum.flat_map(paths, fn path -> get_ids_by_path(map, path) end)
    |> Enum.uniq()
  end

  def remove_val_from_list(list, val) do
    Enum.reject(list, fn x -> x == val end)
  end

  def remove_rule_id_from_rule_map(map, rule_id) do
    Enum.reduce(map, %{}, fn ({key, value}, acc) ->
      if Map.has_key?(value, "_rule_ids") do
        updated_ids = remove_val_from_list(value["_rule_ids"], rule_id)
        acc |> Map.put(key, Map.put(value, "_rule_ids", updated_ids))
      else
        acc |> Map.put(key, remove_rule_id_from_rule_map(value, rule_id))
      end
    end)
  end

  def remove_rule_ids_from_map(map, rule_ids) do
    Enum.reduce(rule_ids, map, fn rule_id, acc ->
      remove_rule_id_from_rule_map(acc, rule_id)
    end)
  end
end
