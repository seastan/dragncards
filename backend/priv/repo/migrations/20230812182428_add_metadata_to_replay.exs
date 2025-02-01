defmodule DragnCards.Repo.Migrations.AddMetadataToReplay do
  use Ecto.Migration

  def change do
    alter table(:replays) do
      add :metadata, :map
    end
  end
end
