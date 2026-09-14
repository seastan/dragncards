defmodule DragnCards.Repo.Migrations.CreateUserImageDirs do
  use Ecto.Migration

  # Folders become real rows rather than being derived from image paths, so a
  # folder can exist while empty and survives having its last image deleted.
  #
  # No data backfill here: DragnCards.Images.tree/1 unions these rows with the
  # folders implied by existing images, and the nightly Reconciler creates the
  # missing rows, so nothing disappears in between.
  def change do
    create table(:user_image_dirs) do
      add :user_id, references(:users, on_delete: :delete_all), null: false
      # e.g. "mygame/English". The root ("") is implicit and never stored.
      add :path, :string, null: false, size: 200
      # NFC-normalised, case-folded; the uniqueness key. See Paths.ci/1.
      add :path_ci, :string, null: false, size: 200

      timestamps(type: :utc_datetime)
    end

    create unique_index(:user_image_dirs, [:user_id, :path_ci])
  end
end
