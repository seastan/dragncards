defmodule DragnCardsGame.PluginGameHelper do
  @moduledoc """
  Builds a real plugin + game from a plugin's JSON and TSV directories, for
  integration tests and benchmarks that exercise the interpreter end to end.

  Callers must already hold an Ecto sandbox connection (e.g. via ConnCase).
  """
  import Ecto.Query
  alias DragnCards.{Repo, Plugins}
  alias DragnCards.Users.User
  alias DragnCardsGame.GameUI
  alias DragnCardsUtil.{Merger, TsvProcess}

  @doc "Returns {json_path, tsv_path} for the LotR plugin, or nil if unavailable."
  def lotr_paths do
    json = System.get_env("LOTR_PLUGIN_JSON_PATH") || Path.expand("~/repos/other/dragncards-lotrlcg-plugin/jsons")
    tsv = System.get_env("LOTR_PLUGIN_TSV_PATH") || Path.expand("~/repos/other/dragncards-lotrlcg-plugin/tsvs")
    if File.dir?(json) and File.dir?(tsv), do: {json, tsv}, else: nil
  end

  def load_plugin_files(json_path, tsv_path) do
    game_def = Merger.merge_json_files(Path.wildcard(Path.join(json_path, "*.json")))

    card_db =
      Path.wildcard(Path.join(tsv_path, "*.tsv"))
      |> Enum.reduce(%{}, fn filename, acc ->
        rows = File.stream!(filename) |> Stream.map(&String.split(&1, "\t")) |> Enum.to_list()
        Merger.deep_merge([acc, TsvProcess.process_rows(game_def, rows)])
      end)

    {game_def, card_db}
  end

  def setup_game(json_path, tsv_path) do
    {:ok, user} =
      %User{}
      |> User.changeset(%{
        alias: "dev_user",
        email: "dev_user@example.com",
        password: "password",
        password_confirmation: "password",
        supporter_level: 1,
        language: "English",
        plugin_settings: %{}
      })
      |> Repo.insert()

    {game_def, card_db} = load_plugin_files(json_path, tsv_path)

    Plugins.create_plugin(%{
      "name" => game_def["pluginName"],
      "author_id" => user.id,
      "game_def" => game_def,
      "card_db" => card_db,
      "public" => true
    })

    plugin = Repo.one(from(p in Plugins.Plugin, limit: 1))

    gameui =
      GameUI.new("room-slug-1234", user.id, %{
        "privacyType" => "public",
        "pluginId" => plugin.id,
        "pluginVersion" => plugin.version,
        "language" => "English",
        "pluginName" => plugin.name
      })

    game =
      gameui["game"]
      |> put_in(["playerUi"], %{"activeCardId" => "", "playerN" => "player1"})
      |> put_in(["playerInfo"], gameui["playerInfo"])

    %{user: user, game: game, gameui: gameui, game_def: plugin.game_def, card_db: plugin.card_db}
  end
end
