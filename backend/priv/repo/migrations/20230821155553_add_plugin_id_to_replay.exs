defmodule DragnCards.Repo.Migrations.AddPluginIdToReplay do
  use Ecto.Migration

  def change do
    alter table(:replays) do
      add :plugin_id, :integer
    end
  end
end
