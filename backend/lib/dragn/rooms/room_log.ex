defmodule DragnCards.Rooms.RoomLog do
  @moduledoc """
  Represents a room where people join and play a game.
  """
  use Ecto.Schema
  import Ecto.Changeset
  require Logger

  # Automatically convert to JSON when broadcasting %Room{}
  # Objects over channel messages
  @derive {Jason.Encoder, only: [:creator_id, :plugin_id]}

  schema "room_log" do
    field :creator_id, :integer
    field :plugin_id, :integer

    timestamps()
  end

  @doc false
  def changeset(room_log, attrs) do
    room_log
    |> cast(attrs, [:creator_id, :plugin_id])
    |> validate_required([:creator_id, :plugin_id])
  end

end
