defmodule DragnCards.Lfg.LfgPost do
  use Ecto.Schema
  import Ecto.Changeset

  @derive {Jason.Encoder,
           only: [
             :id,
             :user_id,
             :plugin_id,
             :description,
             :num_players_wanted,
             :experience_level,
             :available_from,
             :available_to,
             :status,
             :confirmed_start_time,
             :room_slug,
             :inserted_at,
             :user_alias,
             :responses
           ]}

  schema "lfg_posts" do
    field :user_id, :integer
    field :plugin_id, :integer
    field :description, :string
    field :num_players_wanted, :integer
    field :experience_level, :string, default: "any"
    field :available_from, :utc_datetime
    field :available_to, :utc_datetime
    field :status, :string, default: "open"
    field :confirmed_start_time, :utc_datetime
    field :room_slug, :string

    # Virtual fields for preloaded data
    field :user_alias, :string, virtual: true
    field :responses, {:array, :map}, virtual: true, default: []

    timestamps()
  end

  def changeset(post, attrs) do
    post
    |> cast(attrs, [
      :user_id,
      :plugin_id,
      :description,
      :num_players_wanted,
      :experience_level,
      :available_from,
      :available_to,
      :status,
      :confirmed_start_time,
      :room_slug
    ])
    |> validate_required([:user_id, :plugin_id, :num_players_wanted, :available_from, :available_to])
    |> validate_number(:num_players_wanted, greater_than_or_equal_to: 1)
    |> validate_inclusion(:status, ["open", "filled", "started", "expired"])
    |> validate_inclusion(:experience_level, ["any", "beginner", "intermediate", "expert"])
    |> validate_availability_window()
  end

  defp validate_availability_window(changeset) do
    from = get_field(changeset, :available_from)
    to = get_field(changeset, :available_to)
    now = DateTime.utc_now()

    changeset =
      if to && DateTime.compare(to, now) != :gt do
        add_error(changeset, :available_to, "must be in the future")
      else
        changeset
      end

    if from && to && DateTime.compare(from, to) != :lt do
      add_error(changeset, :available_to, "must be after available_from")
    else
      changeset
    end
  end
end
