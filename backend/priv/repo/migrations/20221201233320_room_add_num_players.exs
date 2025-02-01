defmodule DragnCards.Repo.Migrations.RoomAddNumPlayers do
  use Ecto.Migration

  def change do
    alter table(:rooms) do
      add :num_players, :integer, null: false
    end
  end
end
