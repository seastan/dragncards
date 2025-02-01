defmodule DragnCardsGame.Groups do
  @moduledoc """

  """

  alias DragnCardsUtil.{Merger}

  @type t :: Map.t()

  @doc """
  """
  @spec new(Map.t()) :: Map.t()
  def new(game_def) do
    groups = game_def["groups"]
    groupTypes = game_def["groupTypes"]
    Enum.reduce(groups, %{}, fn({group_id, this_group_info}, acc) ->
      group_info = if groupTypes != nil and this_group_info["groupType"] != nil do
        group_type_info = groupTypes[this_group_info["groupType"]]
        Merger.deep_merge([group_type_info, this_group_info])
      else
        this_group_info
      end
      acc
      |> put_in([group_id], group_info)
      |> put_in([group_id, "stackIds"], [])
      |> put_in([group_id, "id"], group_id)
    end)
  end

end
