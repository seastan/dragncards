defmodule DragnCards.Repo.Migrations.AlterDecksForCascadeDelete do
  use Ecto.Migration

  def up do
    alter table(:decks) do
      modify :plugin_id, references(:plugins, on_delete: :delete_all), from: references(:plugins)
    end
  end

  def down do
    alter table(:decks) do
      modify :plugin_id, references(:plugins), from: references(:plugins, on_delete: :delete_all)
    end
  end
end
