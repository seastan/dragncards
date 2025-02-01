defmodule DragnCards.Repo.Migrations.AddDeltasToReplays do
  use Ecto.Migration

  def change do
    alter table(:replays) do
      add :deltas, {:array, :map}
    end
  end
end
