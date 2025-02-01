defmodule DragnCards.Repo.Migrations.CreateDecks do
  use Ecto.Migration

  def change do
    create table(:decks) do
      add :name, :string, null: false
      add :author_id, references(:users, on_delete: :nothing), null: false
      add :plugin_id, references(:plugins, on_delete: :nothing), null: false
      add :load_list, {:array, :map}, null: false

      timestamps()
    end

    create index(:decks, [:author_id])
    create index(:decks, [:plugin_id])
  end
end
