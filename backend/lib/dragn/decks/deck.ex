defmodule DragnCards.Decks.Deck do
  use Ecto.Schema
  import Ecto.Changeset

  @derive {Jason.Encoder, only: [:id, :author_id, :plugin_id, :name, :load_list, :public]}

  schema "decks" do
    field :name, :string
    field :author_id, :id
    field :plugin_id, :id
    field :load_list, {:array, :map}
    field :public, :boolean, default: false

    timestamps()
  end

  @doc false
  def changeset(deck, attrs) do
    deck
    |> cast(attrs, [:name, :author_id, :plugin_id, :load_list, :public])
    |> validate_required([:name, :author_id, :plugin_id, :load_list, :public])
  end
end
