defmodule DragnCards.Application do
  @moduledoc false

  use Application

  def start(_type, _args) do
    # List all child processes to be supervised
    children = [
      # MNesia for Pow - will need reworking in prod
      Pow.Store.Backend.MnesiaCache,
      # Start the Ecto repository
      DragnCards.Repo,
      # Start the endpoint when the application starts
      DragnCardsWeb.Endpoint,
      # GameUISupervisor and Process Registry
      {Registry, keys: :unique, name: DragnCardsGame.GameUIRegistry},
      DragnCardsGame.GameUISupervisor,
      # ChatSupervisor and Process Registry
      {Registry, keys: :unique, name: DragnCardsChat.ChatRegistry},
      DragnCardsChat.ChatSupervisor,
      # Room Cleanup
      {Periodic,
       run: &DragnCardsGame.GameRegistry.cleanup/0,
       initial_delay: :timer.seconds(1),
       every: :timer.minutes(5)},
      # Daily Patreon supporter level reconciliation
      Supervisor.child_spec(
        {Periodic,
         run: &DragnCards.Users.sync_supporter_levels/0,
         initial_delay: :timer.minutes(5),
         every: :timer.hours(24)},
        id: :patreon_sync
      ),
      # Phoenix PubSub
      {Phoenix.PubSub, [name: DragnCards.PubSub, adapter: Phoenix.PubSub.PG2]},
      # Start the CardCache as a GenServer
      {DragnCardsGame.PluginCache, []},
      # Starts a worker by calling: DragnCards.Worker.start_link(arg)
      # {DragnCards.Worker, arg},
    ]

    # Create any other ETS tables (if needed)
    :ets.new(:game_uis, [:public, :named_table])

    # See https://hexdocs.pm/elixir/Supervisor.html
    # for other strategies and supported options
    opts = [strategy: :one_for_one, name: DragnCards.Supervisor]

    Supervisor.start_link(children, opts)
  end

  # Tell Phoenix to update the endpoint configuration
  # whenever the application is updated.
  def config_change(changed, _new, removed) do
    DragnCardsWeb.Endpoint.config_change(changed, removed)
    :ok
  end
end
