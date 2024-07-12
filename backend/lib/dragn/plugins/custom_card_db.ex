defmodule DragnCards.Plugins.CustomCardDb do
  import Ecto.Query, warn: false
  alias DragnCards.Repo
  alias DragnCards.Plugins.CustomCardDb
  use Ecto.Schema
  import Ecto.Changeset

  @derive {Jason.Encoder, only: [:id, :card_db, :public, :author_id, :plugin_id]}

  schema "custom_card_db" do
    field :card_db, :map
    field :public, :boolean
    field :author_id, :id
    field :plugin_id, :id

    timestamps()
  end

  @doc false
  def changeset(custom_card_db, attrs) do
    custom_card_db
    |> cast(attrs, [:card_db, :public, :author_id, :plugin_id])
    |> validate_required([:card_db, :public, :author_id, :plugin_id])
  end

  def create_custom_card_db(attrs \\ %{}) do
    %CustomCardDb{}
    |> changeset(attrs)
    |> Repo.insert()
  end

  def get_custom_card_db(user_id, plugin_id) do
    public_card_db = from(c in CustomCardDb, select: c.card_db, where: c.plugin_id == ^plugin_id and c.author_id == ^user_id and c.public == true) |> Repo.one()
    private_card_db = from(c in CustomCardDb, select: c.card_db, where: c.plugin_id == ^plugin_id and c.author_id == ^user_id and c.public == false) |> Repo.one()
    {public_card_db, private_card_db}
  end

end
