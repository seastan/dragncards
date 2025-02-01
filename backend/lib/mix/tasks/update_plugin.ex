#{:ok, _} = Application.ensure_all_started(:dragncards)

defmodule Mix.Tasks.UpdatePlugin do
  use Mix.Task
  @shortdoc "Updates the plugin for an existing user"

  def run(_args) do
    Mix.Task.run("app.start", [])
    DragnCardsGame.UpdatePluginScript.run()
  end
end


defmodule DragnCardsGame.UpdatePluginScript do
  alias DragnCards.{Repo, Plugins, Plugins.Plugin}
  alias DragnCards.Users.User
  alias Ecto.Multi
  import Ecto.Query
  # Import helper functions
  alias DragnCardsUtil.{Merger}
  alias DragnCardsUtil.{TsvProcess}


  defp get_existing_user(user_alias) do
    # Get all users
    all = Repo.all(from u in User, select: u.alias)
    case Repo.get_by(User, alias: user_alias) do
      nil -> {:error, "User not found"}
      user -> {:ok, user}
    end
  end

  defp get_existing_plugin(plugin_name, plugin_author_id) do
    case Repo.get_by(Plugin, name: plugin_name, author_id: plugin_author_id) do
      nil -> {:error, "Plugin not found"}
      plugin -> {:ok, plugin}
    end
  end

  def run do
    Repo.transaction(fn ->
      case get_existing_user(System.get_env("PLUGIN_AUTHOR")) do
        {:ok, user} ->
          case get_existing_plugin(System.get_env("PLUGIN_NAME"), user.id) do
            {:ok, plugin} ->
              # Set up plugin JSON paths
              plugin_json_path = System.get_env("PLUGIN_JSON_PATH")

              # Get list of all JSON files from the plugin_json_path
              filenames = Path.wildcard(Path.join(plugin_json_path, "*.json"))

              IO.puts("Found #{length(filenames)} JSON files")

              # Merge all JSON files
              game_def = Merger.merge_json_files(filenames)

              # Get list of .tsv files from plugin_tsv_path
              plugin_tsv_path = System.get_env("PLUGIN_TSV_PATH")
              filenames = Path.wildcard(Path.join(plugin_tsv_path, "*.tsv"))

              IO.puts("Found #{length(filenames)} TSV files")

              # Process each .tsv file and merge them into a card_db
              card_db = Enum.reduce(filenames, %{}, fn(filename, acc) ->
                #IO.puts("Processing #{filename}")
                rows = File.stream!(filename)
                |> Stream.map(&String.split(&1, "\t"))
                |> Enum.to_list()

                temp_db = TsvProcess.process_rows(game_def, rows)
                Merger.deep_merge([acc, temp_db])
              end)

              IO.puts("Found #{length(Map.keys(card_db))} cards")

              # Plugin parameters for creation
              updated_params = %{
                "game_def" => game_def,
                "card_db" => card_db,
                "version" => plugin.version + 1
              }
              IO.puts("Found plugin: #{plugin.name}")
              # updated_params = prepare_plugin(user, plugin)
              {_, res} = Plugins.update_plugin(plugin, updated_params)
              IO.puts("Updated plugin. Version: #{res.version}")

            {:error, reason} ->
              IO.puts("Failed to find plugin. Reason: #{reason}")
          end

        {:error, reason} ->
          IO.puts("Failed to find user. Reason: #{reason}")
      end
    end)
  end
end
