defmodule DragnCards.UserPluginPermission do
  use Ecto.Schema
  import Ecto.Changeset
  alias DragnCards.UserPluginPermission
  alias DragnCards.Repo

  @derive {Jason.Encoder, only: [:user_id, :private_access]}

  schema "user_plugin_permission" do
    belongs_to :user, DragnCards.Users.User, foreign_key: :user_id
    belongs_to :plugin, DragnCards.Plugins.Plugin, foreign_key: :private_access

    timestamps()
  end

  @doc false
  def changeset(user_plugin_permission, attrs) do
    user_plugin_permission
    |> cast(attrs, [:user_id, :private_access])
    |> validate_required([:user_id, :private_access])
    |> foreign_key_constraint(:user_id)
    |> foreign_key_constraint(:private_access)
  end

  def create_user_plugin_permission(user_id, plugin_id) do
    changeset = UserPluginPermission.changeset(%UserPluginPermission{}, %{user_id: user_id, private_access: plugin_id})
    case Repo.insert(changeset) do
      {:ok, _struct} ->
        {:ok, "Successfully added"}

      {:error, _changeset} ->
        {:error, "Failed to add permissions"}
    end
  end

  def delete_user_plugin_permission(user_id, plugin_id) do

    user_plugin_permission = Repo.get_by(UserPluginPermission, user_id: user_id, private_access: plugin_id)

    case user_plugin_permission do
      nil ->
        IO.puts("Record not found")
        {:error, :not_found}

      record ->
        case Repo.delete(record) do
          {:ok, _struct} ->
            {:ok,"Successfully deleted" }

          {:error, _changeset} ->
            {:error, "Failed to remove permissions"}
        end
    end
  end

end
