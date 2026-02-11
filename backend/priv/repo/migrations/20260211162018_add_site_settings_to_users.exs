defmodule DragnCards.Repo.Migrations.AddSiteSettingsToUsers do
  use Ecto.Migration

  def change do
    alter table(:users) do
      add :favorite_plugins, :map, default: %{}
      add :whats_new_dismissed, :integer, default: 0
    end
  end
end
