defmodule DragnCardsGame.PluginCache do
  use GenServer
  alias DragnCards.{Plugins}

  @table_name :card_db_cache
  @cache_ttl 60*60*1000 # Cache TTL in milliseconds (1 hour)

  # Start the GenServer and initialize the ETS table
  def start_link(_) do
    GenServer.start_link(__MODULE__, [], name: __MODULE__)
  end

  # Initialize the ETS table when the GenServer starts
  def init(_) do
    :ets.new(@table_name, [:set, :public, :named_table])
    {:ok, %{}}
  end

  # Public function to get cached card_db, or fetch if not present or expired
  def get_plugin_cached(plugin_id, ttl_ms \\ @cache_ttl) do
    case :ets.lookup(@table_name, plugin_id) do
      [{^plugin_id, {plugin, timestamp}}] ->
        # Move the freshness check outside the guard
        if fresh?(timestamp, ttl_ms) do
          plugin
        else
          refresh_plugin(plugin_id)
        end

      [] ->
        # If not in cache, fetch and store it
        refresh_plugin(plugin_id)
    end
  end

  def get_game_def_cached(plugin_id) do
    plugin = get_plugin_cached(plugin_id)
    plugin.game_def
  end

  def get_card_db_cached(plugin_id) do
    plugin = get_plugin_cached(plugin_id)
    plugin.card_db
  end

  def get_card_cached(plugin_id, card_db_id) do
    card_db = get_card_db_cached(plugin_id)
    {:ok, card_db[card_db_id]}
  end

  # Refresh the plugin and store it in the cache with a new timestamp
  defp refresh_plugin(plugin_id) do
    plugin = Plugins.get_plugin!(plugin_id)
    :ets.insert(@table_name, {plugin_id, {plugin, current_timestamp()}})
    plugin
  end

  # Helper function to check if the cache is still fresh
  defp fresh?(timestamp, ttl_ms \\ @cache_ttl) do
    current_timestamp() - timestamp < ttl_ms
  end

  # Helper function to get the current system time in milliseconds
  defp current_timestamp do
    :erlang.monotonic_time(:millisecond)
  end
end
