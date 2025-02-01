defmodule DragnCardsWeb.API.V1.AlertController do
  use DragnCardsWeb, :controller
  alias DragnCards.{Alerts}
  alias Plug.Conn

  # In postgres, ust the following command to manually set an alert, which rooms check on newround to see if there is a recent one.any()
  # INSERT INTO alerts (message, inserted_at, updated_at, minutes_until) VALUES('DragnCards will be shutting down soon for scheduled maintenence. Your game has just been saved to your profile.',(now() at time zone 'utc'),(now() at time zone 'utc'),30);

  # Get alert
  @spec show(Conn.t(), map()) :: Conn.t()
  def show(conn, _map) do
    alert = Alerts.get_alert()
    case alert do
      nil ->
        json(conn, %{message: nil, minutes_remaining: nil})
      _ ->
        minutes_since_alert = round((DateTime.diff(DateTime.utc_now(),alert[:inserted_at]))/60)
        minutes_remaining = alert[:minutes_until] - minutes_since_alert
        minutes_remaining = if minutes_remaining > -5 and minutes_remaining < 0 do 0 else minutes_remaining end
        if minutes_remaining >= 0 and minutes_remaining <= 30 do
            json(conn, %{message: alert[:message], minutes_remaining: minutes_remaining})
        else
          json(conn, %{message: nil, minutes_remaining: nil})
        end
    end
  end

end
