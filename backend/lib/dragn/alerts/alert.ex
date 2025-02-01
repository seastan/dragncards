defmodule DragnCards.Alerts.Alert do
  @moduledoc """
  Represents a user of the system.
  Managed by the "pow" library.
  """
  use Ecto.Schema
  @timestamps_opts [type: :utc_datetime]
  use Pow.Ecto.Schema

  schema "alerts" do
    field(:message, :string)
    field(:minutes_until, :integer)
    timestamps()
  end

end
