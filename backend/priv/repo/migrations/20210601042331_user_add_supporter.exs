defmodule DragnCards.Repo.Migrations.UserAddSupporter do
  use Ecto.Migration

  def change do
    alter table("users") do
      add(:supporter_level, :integer)
    end
  end
end
