defmodule DragnCards.Images.UserImage do
  @moduledoc """
  One stored, normalised image belonging to a user.

  `path` is relative to the user's root and maps 1:1 to both disk and URL.
  `path_ci` exists only to back the case-insensitive uniqueness index; see
  `DragnCards.Images.Paths.ci/1`.
  """
  use Ecto.Schema
  import Ecto.Changeset

  @derive {Jason.Encoder,
           only: [
             :id,
             :dir,
             :filename,
             :path,
             :bytes,
             :width,
             :height,
             :profile,
             :original_filename,
             :inserted_at,
             :updated_at,
             :url
           ]}

  schema "user_images" do
    field :user_id, :integer
    field :dir, :string, default: ""
    field :filename, :string
    field :path, :string
    field :path_ci, :string
    field :bytes, :integer
    field :width, :integer
    field :height, :integer
    field :profile, :string
    field :sha256, :string
    field :original_filename, :string
    field :original_bytes, :integer

    # Built on the way out rather than stored, so that changing
    # UPLOADS_PUBLIC_BASE_URL (beta vs prod) does not require rewriting rows.
    field :url, :string, virtual: true

    timestamps(type: :utc_datetime)
  end

  # :dir is cast but deliberately NOT in @required: a root-level image has
  # dir == "", and Ecto's validate_required treats an empty string as blank.
  # The column is NOT NULL with a "" default, so it is still guarded.
  @required ~w(user_id filename path path_ci bytes width height profile sha256)a
  @optional ~w(dir original_filename original_bytes)a

  def changeset(user_image, attrs) do
    user_image
    |> cast(attrs, @required ++ @optional)
    |> validate_required(@required)
    |> validate_number(:bytes, greater_than_or_equal_to: 0)
    |> validate_number(:width, greater_than: 0)
    |> validate_number(:height, greater_than: 0)
    |> unique_constraint([:user_id, :path_ci], name: :user_images_user_id_path_ci_index)
  end

  @doc "Populates the virtual :url field."
  def with_url(%__MODULE__{} = image) do
    %{image | url: DragnCards.Images.Paths.public_url(image.user_id, image.path)}
  end
end
