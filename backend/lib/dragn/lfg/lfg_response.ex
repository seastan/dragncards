defmodule DragnCards.Lfg.LfgResponse do
  use Ecto.Schema
  import Ecto.Changeset

  @derive {Jason.Encoder, only: [:id, :lfg_post_id, :user_id, :earliest_start, :user_alias]}

  schema "lfg_responses" do
    field :lfg_post_id, :integer
    field :user_id, :integer
    field :earliest_start, :utc_datetime

    # Virtual field for preloaded data
    field :user_alias, :string, virtual: true

    timestamps()
  end

  def changeset(response, attrs) do
    response
    |> cast(attrs, [:lfg_post_id, :user_id, :earliest_start])
    |> validate_required([:lfg_post_id, :user_id, :earliest_start])
    |> unique_constraint([:lfg_post_id, :user_id])
  end
end
