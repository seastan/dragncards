defmodule DragnCards.Repo.Migrations.AddDefaultLanguageToUsers do
  use Ecto.Migration

  def up do
    execute("ALTER TABLE users ALTER COLUMN language SET DEFAULT 'English'")
  end

  def down do
    execute("ALTER TABLE users ALTER COLUMN language DROP DEFAULT")
  end
end
