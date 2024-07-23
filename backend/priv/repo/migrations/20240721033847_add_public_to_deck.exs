defmodule DragnCards.Repo.Migrations.AddPublicToDeck do
  use Ecto.Migration

  def change do
    alter table(:decks) do
      add :public, :boolean, default: false
    end

  end
end
