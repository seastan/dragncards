defmodule DragnCardsWeb.API.V1.GameController do
  use DragnCardsWeb, :controller

  require Logger

  alias DragnCards.{Rooms, Users}
  alias DragnCardsUtil.{NameGenerator}
  alias DragnCardsGame.GameUISupervisor

  def create(conn, params) do
    Logger.debug("game_controller create")
    game_name = NameGenerator.generate()
    user_id = params["room"]["user"]
    #query = from User, where: [id: ^user_id], select: [:alias]
    user = Users.get_user(user_id)
    options = %{
      "privacyType" => params["room"]["privacy_type"],
      "replayUuid" => params["game_options"]["replay_uuid"],
      "externalData" => params["game_options"]["external_data"],
      "ringsDbInfo" => params["game_options"]["ringsdb_info"],
      "pluginId" => params["game_options"]["plugin_id"],
      "pluginVersion" => params["game_options"]["plugin_version"],
      "pluginName" => params["game_options"]["plugin_name"],
    }
    GameUISupervisor.start_game(game_name, user, options)
    room = Rooms.get_room_by_name(game_name)
    if room do
      Logger.debug("game ok")
      conn
      |> put_status(:created)
      |> json(%{success: %{message: "Created game", room: room}})
    else
      Logger.debug("game not ok")
      conn
      |> put_status(500)
      |> json(%{error: %{status: 500, message: "Unable to create game"}})
    end
  end
end
