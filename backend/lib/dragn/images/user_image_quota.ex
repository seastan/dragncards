defmodule DragnCards.Images.UserImageQuota do
  @moduledoc """
  Per-user usage counters and prune state, one row per user.

  Counters are maintained transactionally by `DragnCards.Images.Quota` rather
  than derived with `count()`/`sum()`, for two reasons: Postgres forbids
  `FOR UPDATE` alongside aggregates, and this row is the lock target that
  serialises one user's concurrent uploads. `DragnCards.Images.Reconciler`
  repairs any drift.
  """
  use Ecto.Schema
  import Ecto.Changeset

  @derive {Jason.Encoder,
           only: [:user_id, :image_count, :total_bytes, :over_quota_since, :last_pruned_at]}

  @primary_key false
  schema "user_image_quota" do
    field :user_id, :integer, primary_key: true
    field :image_count, :integer, default: 0
    field :total_bytes, :integer, default: 0

    # Set the first time a user is found over quota, cleared when they come back
    # under. The prune fires once this is older than :prune_grace_days.
    field :over_quota_since, :utc_datetime
    field :last_notified_at, :utc_datetime
    field :notify_count, :integer, default: 0
    field :last_pruned_at, :utc_datetime
    field :last_reconciled_at, :utc_datetime

    timestamps(type: :utc_datetime)
  end

  def changeset(quota, attrs) do
    quota
    |> cast(attrs, [
      :user_id,
      :image_count,
      :total_bytes,
      :over_quota_since,
      :last_notified_at,
      :notify_count,
      :last_pruned_at,
      :last_reconciled_at
    ])
    |> validate_required([:user_id])
    |> validate_number(:image_count, greater_than_or_equal_to: 0)
    |> validate_number(:total_bytes, greater_than_or_equal_to: 0)
  end
end
