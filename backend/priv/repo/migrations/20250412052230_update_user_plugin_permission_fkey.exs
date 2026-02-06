defmodule DragnCards.Repo.Migrations.UpdateUserPluginPermissionFkey do
  use Ecto.Migration

  def change do
    # Drop the named foreign key constraint
    execute("""
    ALTER TABLE user_plugin_permission
    DROP CONSTRAINT IF EXISTS user_plugin_permission_private_access_fkey
    """)

    # Re-add the reference with ON DELETE CASCADE
    alter table(:user_plugin_permission) do
      modify :private_access, references(:plugins, on_delete: :delete_all), from: :integer
    end
  end

end
