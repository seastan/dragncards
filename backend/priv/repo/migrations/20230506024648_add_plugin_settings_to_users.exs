defmodule DragnCards.Repo.Migrations.AddPluginSettingsToUsers do
  use Ecto.Migration

  alias DragnCards.Users.User
  alias DragnCards.Repo

  import Ecto.Query


  def up do
    alter table(:users) do
      add :plugin_settings, :map, default: %{}
    end

  end

  def down do
    alter table(:users) do
      remove :plugin_settings
    end
  end

end
