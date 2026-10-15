defmodule DragnCardsWeb.ReplayView do
  use DragnCardsWeb, :view
  alias DragnCardsWeb.ReplayView

  def render("index.json", %{replays: replays}) do
    %{data: render_many(replays, ReplayView, "replay.json")}
  end

  def render("replay.json", %{replay: replay}) do
    %{
      uuid: replay.uuid,
      metadata: replay.metadata,
      plugin_id: replay.plugin_id,
      plugin_name: replay.plugin_name,
      player_aliases: replay.player_aliases,
      # Stored as naive UTC; mark it so browsers convert to local time
      updated_at: NaiveDateTime.to_iso8601(replay.updated_at) <> "Z",
    }
  end
end
