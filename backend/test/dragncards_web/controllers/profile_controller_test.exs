defmodule DragnCards.ProfileControllerTest do
  use ExUnit.Case, async: true
  use DragnCardsWeb.ConnCase
  alias DragnCards.{Plugins, Plugins.Plugin, Repo}
  alias DragnCards.Users.User
  import Ecto.Query
  alias Jason

  alias DragnCardsGame.{GameUI, Game, Evaluate}

  import ExUnit.Callbacks

  setup do
    user = Repo.one(from u in DragnCards.Users.User, limit: 1)
    plugin_id = 3

    plugin = Repo.one(from p in Plugin, where: p.id == ^plugin_id)
    card_db = plugin.card_db

    options = %{"pluginId" => plugin_id}

    gameui = GameUI.new("game_name", user.id, options)

    # {:ok, file_content} = File.read("../frontend/src/features/plugins/lotrlcg/definitions/gameDefWotR.json")

    # game_def = case Jason.decode(file_content) do
    #   {:ok, json_map} ->
    #     json_map
    #   {:error, reason} ->
    #     IO.puts("Error decoding JSON: #{reason}")
    # end

    # gameui = put_in(gameui["game"]["gameDef"], game_def)

    # Load a deck
    cards = plugin.game_def["preBuiltDecks"]["Trilogy"]["cards"]
    cards =
      Enum.map(cards, fn item ->
        %{
          "uuid" => item["uuid"],
          "quantity" => item["quantity"],
          "cardDetails" => card_db[item["uuid"]],
          "loadGroupId" => String.replace(item["loadGroupId"], "playerN", "player1")
        }
      end)
    gameui = GameUI.game_action(gameui, user.id, "load_cards", %{"load_list" => cards})
    #assert gameui["game"]["messages"] == ["player1 loaded cards."]

    # Return a tuple with the GameUI instance and the fetched user
    {:ok, %{gameui: gameui, user: user, plugin: plugin}}
  end

  test "update_plugin_settings updates user's plugin_settings map", %{user: user} do
    plugin_id = 3
    card_db_id = "my_card_db_id"
    url = "https://example.com/my_card_db_image.png"
    nested_map = %{
      plugin_id => %{card_db_id => url}
    }

    updates = User.alt_art_updates(user, nested_map)

    changeset = Ecto.Changeset.change(user, updates)

    {:ok, user} = Repo.update(changeset)
    updated_user = Repo.get!(User, user.id)

    assert user.plugin_settings == %{
      plugin_id => %{card_db_id => url}
    }
  end
end
