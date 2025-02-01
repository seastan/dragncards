defmodule DragnCards.Repo.Migrations.SetPluginSettingsToEmpty do
  use Ecto.Migration

  alias DragnCards.Users.User
  alias DragnCards.Repo

  import Ecto.Query

  def up do
    empty = %{}
    from(u in User, update: [set: [plugin_settings: ^empty]]) |> Repo.update_all([])
  end
end
