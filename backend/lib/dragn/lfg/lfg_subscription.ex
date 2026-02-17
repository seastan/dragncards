defmodule DragnCards.Lfg.LfgSubscription do
  use Ecto.Schema
  import Ecto.Changeset

  schema "lfg_subscriptions" do
    field :user_id, :integer
    field :plugin_id, :integer

    timestamps()
  end

  def changeset(subscription, attrs) do
    subscription
    |> cast(attrs, [:user_id, :plugin_id])
    |> validate_required([:user_id, :plugin_id])
    |> unique_constraint([:user_id, :plugin_id])
  end
end
