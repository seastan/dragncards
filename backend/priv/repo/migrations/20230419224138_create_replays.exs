defmodule DragnCards.Repo.Migrations.CreateReplays do
  use Ecto.Migration

  def change do
    create table(:replays) do
      add(:user_id, :integer, null: false)
      add(:uuid, :string, null: false)
      add(:deleted_by, {:array, :integer})
      add(:game_json, :map, null: false)
      add(:description, :string)
      add(:outcome, :string)

      timestamps()
    end
  end
end
