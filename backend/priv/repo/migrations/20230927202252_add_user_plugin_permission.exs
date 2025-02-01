defmodule DragnCards.Repo.Migrations.AddUserPluginPermission do
    use Ecto.Migration

    def change do
      create table(:user_plugin_permission) do
        add :user_id, references(:users, on_delete: :nothing), null: false
        add :private_access, references(:plugins, on_delete: :nothing), null: false

        timestamps()
      end

      create unique_index(:user_plugin_permission, [:user_id, :private_access])
    end
  end
