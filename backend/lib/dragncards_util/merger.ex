
defmodule DragnCardsUtil.Merger do
  def merge_json_files(filenames) do
    filenames
    |> Enum.map(&read_and_parse_json/1)
    |> deep_merge()
  end

  defp read_and_parse_json(filename) do
    filename
    |> File.read!()
    |> remove_comments()
    |> Jason.decode!()
  end

  def deep_merge(list_of_maps) do
    List.foldl(list_of_maps, %{}, fn map, acc -> Map.merge(acc, map, &merge_values/3) end)
  end

  defp merge_values(_key, v1, v2) when is_map(v1) and is_map(v2) do
    Map.merge(v1, v2, &merge_values/3)
  end

  defp merge_values(_key, v1, v2) when is_list(v1) and is_list(v2) do
    v1 ++ v2
  end

  defp merge_values(_key, _v1, v2), do: v2

  def remove_comments(content) do
    Regex.replace(~r/(?<!http:|https:)\/\/.*(?=\n|\r)/, content, "")
  end
end
