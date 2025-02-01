defmodule DragnCards.Settings.CardBackAlt do
  use Ecto.Schema
  import Ecto.Changeset

  schema "card_back_alts" do
    field :alt_url, :string
    field :card_back_name, :string
    field :user_id, :id
    field :plugin_id, :id

    timestamps()
  end

  @doc false
  def changeset(card_back_alt, attrs) do
    card_back_alt
    |> cast(attrs, [:card_back_name, :alt_url])
    |> validate_required([:card_back_name, :alt_url])
  end
end
