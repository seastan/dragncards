defmodule DragnCards.Repo.Migrations.CreatePlugins do
  use Ecto.Migration

  def change do
    create table(:plugins) do
      add :name, :string, null: false
      add :version, :integer, null: false
      add :game_def, :map, null: false
      add :card_db, :map, null: false
      add :num_favorites, :integer, null: false
      add :public, :boolean, default: false, null: false
      add :author_id, references(:users, on_delete: :nothing), null: false

      timestamps()
    end

    create index(:plugins, [:author_id])
  end
end
