defmodule DragnCards.Repo.Migrations.AddPatreonMemberIdToUsers do
  use Ecto.Migration

  def change do
    alter table("users") do
      add :patreon_member_id, :string
    end
  end
end
