defmodule DragnCards.Repo.Migrations.CreateCardAlts do
  use Ecto.Migration

  def change do
    create table(:card_alts) do
      add :card_uuid, :string, null: false
      add :side, :string, null: false
      add :alt_url, :string, null: false
      add :user_id, references(:users, on_delete: :nothing), null: false
      add :plugin_id, references(:plugins, on_delete: :nothing), null: false

      timestamps()
    end

    create index(:card_alts, [:user_id])
    create index(:card_alts, [:plugin_id])
  end
end
