defmodule DragnCards.Repo.Migrations.CreateLfgTables do
  use Ecto.Migration

  def change do
    create table(:lfg_posts) do
      add :user_id, references(:users, on_delete: :delete_all), null: false
      add :plugin_id, references(:plugins, on_delete: :delete_all), null: false
      add :description, :text
      add :num_players_wanted, :integer, null: false
      add :experience_level, :string, default: "any"
      add :available_from, :utc_datetime, null: false
      add :available_to, :utc_datetime, null: false
      add :status, :string, default: "open"
      add :confirmed_start_time, :utc_datetime
      add :room_slug, :string

      timestamps()
    end

    create index(:lfg_posts, [:plugin_id])
    create index(:lfg_posts, [:status])

    create table(:lfg_responses) do
      add :lfg_post_id, references(:lfg_posts, on_delete: :delete_all), null: false
      add :user_id, references(:users, on_delete: :delete_all), null: false
      add :earliest_start, :utc_datetime, null: false

      timestamps()
    end

    create unique_index(:lfg_responses, [:lfg_post_id, :user_id])

    create table(:lfg_subscriptions) do
      add :user_id, references(:users, on_delete: :delete_all), null: false
      add :plugin_id, references(:plugins, on_delete: :delete_all), null: false

      timestamps()
    end

    create unique_index(:lfg_subscriptions, [:user_id, :plugin_id])
  end
end
