defmodule DragnCards.Repo.Migrations.CreateUserImages do
  use Ecto.Migration

  def change do
    create table(:user_images) do
      add :user_id, references(:users, on_delete: :delete_all), null: false

      # "" for the user's root, else e.g. "mygame/English". No leading or
      # trailing slash. Denormalised alongside :path so listing a folder is an
      # index lookup rather than a string operation.
      add :dir, :string, null: false, default: "", size: 200
      add :filename, :string, null: false, size: 120
      add :path, :string, null: false, size: 300

      # NFC-normalised, case-folded copy of :path. Postgres and ext4 are both
      # case-sensitive but macOS and Windows are not, and that mismatch is
      # exactly how the database and the disk drift apart. Case is preserved in
      # :path (and so on disk and in URLs); only collisions are prevented.
      add :path_ci, :string, null: false, size: 300

      add :bytes, :integer, null: false
      add :width, :integer, null: false
      add :height, :integer, null: false
      add :profile, :string, null: false

      # Of the normalised WebP. Not used for dedupe yet: it makes a retried
      # batch idempotent, and leaves the door open to hardlink dedupe later
      # without a migration.
      add :sha256, :string, null: false, size: 64

      add :original_filename, :string, size: 255
      add :original_bytes, :integer

      timestamps(type: :utc_datetime)
    end

    create unique_index(:user_images, [:user_id, :path_ci])
    create index(:user_images, [:user_id, :dir])
    # The prune walks newest-first.
    create index(:user_images, [:user_id, :inserted_at, :id])
    create index(:user_images, [:sha256])

    # One row per user. Counters rather than an aggregate over user_images,
    # because Postgres forbids FOR UPDATE with aggregates and this row is the
    # lock target that serialises a user's concurrent uploads.
    create table(:user_image_quota, primary_key: false) do
      add :user_id, references(:users, on_delete: :delete_all),
        primary_key: true,
        null: false

      add :image_count, :integer, null: false, default: 0
      add :total_bytes, :bigint, null: false, default: 0

      # Prune state. Lives here rather than on users so Pow's schema and
      # changeset stay untouched.
      add :over_quota_since, :utc_datetime
      add :last_notified_at, :utc_datetime
      add :notify_count, :integer, null: false, default: 0
      add :last_pruned_at, :utc_datetime
      add :last_reconciled_at, :utc_datetime

      timestamps(type: :utc_datetime)
    end
  end
end
