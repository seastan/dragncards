defmodule DragnCards.Repo.Migrations.CreateRoomLog do
  use Ecto.Migration

  def change do
    create table(:room_log) do
      add :creator_id, references(:users, on_delete: :nothing), null: false
      add :plugin_id, references(:plugins, on_delete: :nothing), null: false

      timestamps()
    end

  end

end
