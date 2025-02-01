defmodule DragnCards.RoomsTest do
  use DragnCards.DataCase

  alias DragnCards.Rooms

  describe "rooms" do
    alias DragnCards.Rooms.Room

    test "updates the name of the room with the given slug" do
      # Set up a room with a known slug
      attrs = %{
        name: "Original Name",
        created_by: 1,
        privacy_type: "private",
        last_update: 12345,
        num_players: 1,
        plugin_id: 3
      }

      {:ok, room} = Rooms.create_room(attrs)
      slug = room.slug

      # Update the room's name
      Rooms.update_room(room, %{name: "New Name"})

      # Verify that the room's name has been updated
      assert Rooms.get_room!(room.id).name == "New Name"
    end

  end
end
