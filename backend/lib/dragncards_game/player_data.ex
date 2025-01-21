defmodule DragnCardsGame.PlayerData do
  @moduledoc """
  Represents a player.
  """
  require Logger
  alias DragnCardsGame.{PlayerData}

  @type t :: Map.t()

  @doc """
  new/1:  Create a player.
  """
  @spec new(Map.t(), String.t()) :: PlayerData.t()
  def new(game_def, player_i) do
    player_count_info = Enum.at(game_def["playerCountMenu"],0)
    layout_id = player_count_info["layoutId"]

    base = %{
      "id" => player_i,
      "user_id" => nil,
      "alias" => nil,
      "drawingArrowFrom" => nil,
      "label" => nil,
      "prompts" => %{},
      "browseGroup" => %{
        "id" => nil,
        "topN" => 0
      },
      "layoutId" => layout_id,
      "layout" => game_def["layouts"][layout_id],
      "touchAction" => nil
    }
    # Add custom properties
    Enum.reduce(game_def["playerProperties"], base, fn({key,val}, acc) ->
      put_in(acc[key], val["default"])
    end)
  end

end
