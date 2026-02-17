defmodule DragnCardsWeb.ReplayController do
  use DragnCardsWeb, :controller
  import Ecto.Query

  alias DragnCards.{Replay, Repo}

  # alias DragnCardsUtil.{NameGenerator, Slugify}
  # alias DragnCardsGame.GameSupervisor

  action_fallback DragnCardsWeb.FallbackController

  def index(conn, params) do
    user_id = String.to_integer(params["user_id"])
    # Faster to gather all columns except game_json
    query = from r in Replay,
      order_by: [desc: r.updated_at],
      where: fragment("? = ANY(?)", ^user_id, r.player_ids) or r.user_id == ^user_id,
      select: [:deleted_by, :uuid, :updated_at, :inserted_at, :user_id, :metadata, :plugin_id, :player_ids]
    replays = Repo.all(query)
    render(conn, "index.json", replays: replays)
  end


  # Update: Update profile settings.
  @spec delete(Conn.t(), Map.t()) :: Conn.t()
  def delete(conn, params) do
    user_id = params["user"]["id"]
    replay = params["replay"]
    new_deleted_by = if replay["deleted_by"] do
      replay["deleted_by"] ++ [user_id]
    else
      [user_id]
    end
    updates = %{
      deleted_by: new_deleted_by
    }
    # Get replay from database where uuid and user_id match
    r = Repo.get_by!(Replay, uuid: replay["uuid"])
    c = Ecto.Changeset.change(r, updates)
    case Repo.update(c) do
      {:ok, _struct}       -> # Updated with success
        conn
        |> json(%{success: %{message: "Deleted replay"}})
      {:error, _changeset} -> # Something went wrong
        conn
        |> json(%{success: %{message: "Failed to delete replay"}})
    end
    # query = from(r in Replay, where: r.uuid == ^uuid)
    # case Repo.delete_all(query) do
    #   {1, nil}       -> # Updated with success
    #     conn
    #     |> json(%{success: %{message: "Deleted replay."}})
    #   _ -> # Something went wrong
    #     conn
    #     |> json(%{success: %{message: "Failed to delete replay."}})
    # end
    # user_id = user["id"]
    # updates = %{
    #   background_url: user["background_url"],
    #   player_back_url: user["player_back_url"],
    #   encounter_back_url: user["encounter_back_url"],
    #   language: user["language"],
    # }
    # u = Repo.get!(User, user_id)
    # u = Ecto.Changeset.change(u, updates)
    # case Repo.update(u) do
    #   {:ok, struct}       -> # Updated with success
    #     conn
    #     |> json(%{success: %{message: "Updated settings"}})
    #   {:error, changeset} -> # Something went wrong
    #     IO.inspect(changeset, label: "Failed to update settings")
    #     conn
    #     |> json(%{success: %{message: "Failed to update settings"}})
    # end

  end

  # Create: Removed, users no longer able to create rooms by API
  # Possibly this entire controller should be removed

  # def show(conn, %{"id" => id}) do
  #   room = Rooms.get_room!(id)
  #   render(conn, "show.json", room: room)
  # end

  # def update(conn, %{"id" => id, "room" => room_params}) do
  #   room = Rooms.get_room!(id)

  #   with {:ok, %Room{} = room} <- Rooms.update_room(room, room_params) do
  #     render(conn, "show.json", room: room)
  #   end
  # end

  # def delete(conn, %{"id" => id}) do
  #   room = Rooms.get_room!(id)

  #   with {:ok, %Room{}} <- Rooms.delete_room(room) do
  #     send_resp(conn, :no_content, "")
  #   end
  # end
end
