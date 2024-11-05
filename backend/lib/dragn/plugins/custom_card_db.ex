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

  def get_author_id_from_database_id(database_id) do
    split_database_id = String.split(database_id, "-")
    author_id_string = Enum.at(split_database_id, 1)
    String.to_integer(author_id_string)
  end

  def get_private_card_details(plugin_id, user_id, database_id) do
    from(c in CustomCardDb,
      select: fragment("card_db -> ?", ^database_id),
      where: c.plugin_id == ^plugin_id and c.author_id == ^user_id and c.public == false
    ) |> Repo.one()
  end

  def get_public_card_details(plugin_id, database_id) do
    author_id = get_author_id_from_database_id(database_id)
    IO.puts("Running query with plugin_id #{plugin_id}, author_id #{author_id}, and database_id #{database_id}")
    from(c in CustomCardDb,
      select: fragment("card_db -> ?", ^database_id),
      where: c.plugin_id == ^plugin_id and c.author_id == ^author_id and c.public == true
    ) |> Repo.one()
  end

  def get_card_details_for_user(plugin_id, user_id, database_id) do
    # First see if it's in the user's private cards
    case get_private_card_details(plugin_id, user_id, database_id) do
      nil ->
        IO.puts("Card with database_id #{database_id} not found in user's private cards.")
        case get_public_card_details(plugin_id, database_id) do
          nil ->
            raise "Card with database_id #{database_id} not found in public cards or in user's private cards."
          card_details -> card_details
        end
      card_details -> card_details
    end
  end

  def get_my_public_and_private_card_dbs(user_id, plugin_id) do
    # IO.puts("Getting custom card dbs 1")
    # database_id = "author_id-1-public-1-exampledatabaseid11"
    # test_db = from(c in CustomCardDb,
    #   select: fragment("card_db -> ?", ^database_id),
    #   where: c.plugin_id == ^plugin_id and c.author_id == ^user_id and c.public == true
    # ) |> Repo.one()
    # IO.puts("Getting custom card dbs 2")
    # IO.inspect(test_db)
    # IO.puts("Getting custom card dbs 3")

    public_card_db = from(c in CustomCardDb, select: c.card_db, where: c.plugin_id == ^plugin_id and c.author_id == ^user_id and c.public == true) |> Repo.one()
    private_card_db = from(c in CustomCardDb, select: c.card_db, where: c.plugin_id == ^plugin_id and c.author_id == ^user_id and c.public == false) |> Repo.one()
    {public_card_db, private_card_db}
  end

  def get_all_public_and_my_private_card_dbs(user_id, plugin_id) do
    # Get the CustomCardDb from all users that are public
    public_card_db = from(c in CustomCardDb, select: c.card_db, where: c.plugin_id == ^plugin_id and c.public == true)
    |> Repo.all()
    |> Enum.reduce(%{}, fn(card_db, acc) ->
      acc
      |> Map.merge(card_db)
    end)

    # Get the CustomCardDb from the current user that are private
    private_card_db = from(c in CustomCardDb, select: c.card_db, where: c.plugin_id == ^plugin_id and c.author_id == ^user_id and c.public == false) |> Repo.one()
    {public_card_db, private_card_db}
  end

end
