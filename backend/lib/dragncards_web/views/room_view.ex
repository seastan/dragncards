defmodule DragnCardsWeb.RoomView do
  use DragnCardsWeb, :view
  alias DragnCardsWeb.RoomView

  def render("index.json", %{rooms: rooms}) do
    %{data: render_many(rooms, RoomView, "room.json")}
  end

  def render("show.json", %{room: room}) do
    %{data: render_one(room, RoomView, "room.json")}
  end

  def render("room.json", %{room: room}) do
    %{
      id: room.id,
      name: room.name,
      slug: room.slug,
      created_by: room.created_by,
      privacy_type: room.privacy_type,
      last_update: room.last_update,
      num_players: room.num_players,
      plugin_id: room.plugin_id,
    }
  end
end
