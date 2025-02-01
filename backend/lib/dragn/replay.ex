defmodule DragnCards.Replay do
  use Ecto.Schema
  import Ecto.Changeset

  schema "replays" do
    field :user_id, :integer
    field :uuid, :string
    field :deleted_by, {:array, :integer}
    field :game_json, :map
    field :description, :string
    field :outcome, :string
    field :metadata, :map
    field :plugin_id, :integer
    field :deltas, {:array, :map}

    timestamps()
  end

  def changeset(replay, params \\ %{}) do
    replay
    |> cast(params, [:user_id, :uuid, :deleted_by, :game_json, :description, :outcome, :metadata, :plugin_id, :deltas])
  end

end
