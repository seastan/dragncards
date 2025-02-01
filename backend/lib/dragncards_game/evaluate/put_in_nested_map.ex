defmodule DragnCardsGame.PutInNestedMap do
  def put_in_nested(map, [key], value) do
    Map.put(map, key, value)
  end

  def put_in_nested(map, [key | rest], value) do
    updated_map =
      Map.update(map, key, %{}, fn existing_value ->
        case existing_value do
          %{} -> existing_value
          _ -> %{}  # Ensure it's a map
        end
      end)

    updated_map
    |> Map.update!(key, fn nested_map ->
      put_in_nested(nested_map, rest, value)
    end)
  end
end
