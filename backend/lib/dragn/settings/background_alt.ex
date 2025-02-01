defmodule DragnCards.Settings.BackgroundAlt do
  use Ecto.Schema
  import Ecto.Changeset

  schema "background_alts" do
    field :alt_url, :string
    field :user_id, :id
    field :plugin_id, :id

    timestamps()
  end

  @doc false
  def changeset(background_alts, attrs) do
    background_alts
    |> cast(attrs, [:alt_url])
    |> validate_required([:alt_url])
  end
end
