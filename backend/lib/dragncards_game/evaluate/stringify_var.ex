defmodule DragnCardsGame.StringifyVar do
  def stringify_var(var) do
    if is_map(var) do
      if "roomSlug" in Map.keys(var) do
        "<game state>"
      else
        string_map = IO.inspect(var)
        # If length of string_map is greater than 100, truncate it
        if Enum.count(string_map) > 100 do
          String.slice(string_map, 0, 100) <> "..."
        else
          string_map
        end
      end
    else
      IO.inspect(var)
    end
  end
end
