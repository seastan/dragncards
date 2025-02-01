defmodule DragnCardsGame.GameVariables do
  @moduledoc """
  Represents a player.
  """
  alias DragnCardsGame.{GameVariables}

  @type t :: Map.t()

  @doc """
  new/1:  Create a player.
  """
  @spec default() :: GameVariables.t()
  def default() do
    %{
      "$THIS_ID" => nil,
      "$THIS" => nil,
      "$TARGET_ID" => nil,
      "$TARGET" => nil
    }
  end
end
