defmodule DragnCards.Plugins.Plugin do
  use Ecto.Schema
  import Ecto.Changeset

  @derive {Jason.Encoder, only: [:id, :game_def, :card_db, :version, :name, :repo_url]}

  schema "plugins" do
    field :card_db, :map
    field :game_def, :map
    field :name, :string
    field :num_favorites, :integer, default: 0
    field :public, :boolean, default: false
    field :version, :integer, default: 1
    field :author_id, :id
    field :repo_url, :string

    timestamps()
  end

  @doc false
  def changeset(plugin, attrs) do
    plugin
    |> cast(attrs, [:name, :version, :game_def, :card_db, :num_favorites, :public, :author_id, :repo_url])
    |> validate_required([:name, :version, :game_def, :card_db, :num_favorites, :public, :author_id])
  end
end
