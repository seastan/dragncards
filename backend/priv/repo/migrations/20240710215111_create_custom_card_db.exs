defmodule DragnCards.Repo.Migrations.CreateCustomCardDb do
  use Ecto.Migration

  def change do
    create table(:custom_card_db) do
      add :card_db, :map
      add :public, :boolean, default: true
      add :author_id, references(:users, on_delete: :nothing), null: false
      add :plugin_id, references(:plugins, on_delete: :nothing), null: false

      timestamps()
    end

  end
end
