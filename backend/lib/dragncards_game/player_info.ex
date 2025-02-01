defmodule DragnCardsGame.PlayerInfo do
  @moduledoc """
  Represents a player.
  """
  require Logger
  alias DragnCards.Users

  @type t :: Map.t()

  @doc """
  new/1:  Create a player.
  """
  @spec new(integer) :: Map.t()
  def new(user_id) do
    if user_id == nil do nil else
      user = Users.get_user(user_id)
      if user == nil do nil else
        %{
          "id" => user_id,
          "alias" => user.alias
        }
      end
    end
  end

end
