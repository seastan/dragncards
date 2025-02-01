defmodule DragnCards.Repo.Migrations.AddRepoUrlToPlugins do
  use Ecto.Migration

  def change do
    alter table(:plugins) do
      add :repo_url, :string
    end
  end
end
