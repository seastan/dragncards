defmodule DragnCardsGame.Evaluate.Functions.MAP_SET do
  alias DragnCardsGame.Evaluate
  @moduledoc """
  *Arguments*:
  Any number of arguments

  In DragnLang, the 'MAP_SET' operation is used to create a set of values.

  If there is only one argument and it's a list, then the set is initialized with elements of that list (duplicate values will be discarded). If it's a set, then the set is initialized with elements of that set. If it's an object, then the set is initialized with keys of that object.

  *Returns*:
  (list) A set containing the results of evaluating each argument.
  """

  @doc """
  Executes the 'MAP_SET' operation with the given arguments.

  ## Parameters

    - `args`: The arguments required for the 'MAP_SET' operation.

  ## Returns

  The result of the 'MAP_SET' operation.
  """
  def execute(game, code, trace) do
    list = Enum.slice(code, 1, Enum.count(code))
    count = Enum.count(list)
    if count == 1 do
      first = Evaluate.evaluate(game, List.first(list), trace ++ ["index 0"])
      cond do
        is_list(first) -> MapSet.new(first)
        is_struct(first, MapSet) -> MapSet.new(first)
        is_map(first) -> MapSet.new(Map.keys(first))
        true -> MapSet.new([first])
      end
    else
      Enum.reduce(Enum.with_index(list), MapSet.new(), fn({item, index}, acc)->
        MapSet.put(acc, Evaluate.evaluate(game, item, trace ++ ["index #{index}"]))
      end)
    end
  end

end
