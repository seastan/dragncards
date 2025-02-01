defmodule DragnCards.Settings.CardAlt do
  use Ecto.Schema
  import Ecto.Changeset

  schema "card_alts" do
    field :alt_url, :string
    field :card_uuid, :string
    field :side, :string
    field :user_id, :id
    field :plugin_id, :id

    timestamps()
  end

  @doc false
  def changeset(card_alt, attrs) do
    card_alt
    |> cast(attrs, [:card_uuid, :side, :alt_url])
    |> validate_required([:card_uuid, :side, :alt_url])
  end
end
