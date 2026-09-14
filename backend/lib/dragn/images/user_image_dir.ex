defmodule DragnCards.Images.UserImageDir do
  @moduledoc """
  A folder in a user's image library.

  Folders are explicit so they can exist while empty. Uploads create their
  folder (and its ancestors) automatically; a folder is only ever removed by
  deleting it. The root folder is implicit and has no row.
  """
  use Ecto.Schema

  schema "user_image_dirs" do
    field :user_id, :integer
    field :path, :string
    field :path_ci, :string

    timestamps(type: :utc_datetime)
  end
end
