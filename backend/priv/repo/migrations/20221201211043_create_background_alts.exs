defmodule DragnCards.Repo.Migrations.CreateBackgroundAlt do
  use Ecto.Migration

  def change do
    create table(:background_alts) do
      add :alt_url, :string, null: false
      add :user_id, references(:users, on_delete: :nothing), null: false
      add :plugin_id, references(:plugins, on_delete: :nothing), null: false

      timestamps()
    end

    create index(:background_alts, [:user_id])
    create index(:background_alts, [:plugin_id])
  end
end
