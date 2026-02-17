defmodule DragnCardsWeb.LfgChannel do
  @moduledoc """
  Channel for real-time LFG (Looking for Game) updates per plugin.
  """
  use DragnCardsWeb, :channel

  def join("lfg:" <> _plugin_id, _payload, socket) do
    {:ok, socket}
  end

  def handle_in("ping", payload, socket) do
    {:reply, {:ok, payload}, socket}
  end
end
