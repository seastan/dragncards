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
      # Runs image transcodes off the request process so a hung or crashing
      # libvips call costs one file rather than the whole request.
      {Task.Supervisor, name: DragnCards.Images.TaskSupervisor},
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
      # Plugin image hosting: warn, then prune, users over their limits. Runs 15
      # minutes after the Patreon sync so supporter levels are fresh; guarded by an
      # advisory lock because blue-green deploys run two instances at once.
      Supervisor.child_spec(
        {Periodic,
         run: &DragnCards.Images.Enforcement.run/0,
         initial_delay: :timer.minutes(20),
         every: :timer.hours(24)},
        id: :image_quota_enforcement
      ),
      # Plugin image hosting: repair drift between image rows and files on disk.
      Supervisor.child_spec(
        {Periodic,
         run: &DragnCards.Images.Reconciler.run_all/0,
         initial_delay: :timer.minutes(35),
         every: :timer.hours(24)},
        id: :image_reconcile
      ),
      # LFG room creation (every minute)
      Supervisor.child_spec(
        {Periodic,
         run: &DragnCards.Lfg.create_rooms_for_filled_posts/0,
         initial_delay: :timer.minutes(2),
         every: :timer.minutes(1)},
        id: :lfg_room_creation
      ),
      # LFG expired post cleanup (every hour)
      Supervisor.child_spec(
        {Periodic,
         run: &DragnCards.Lfg.cleanup_expired_posts/0,
         initial_delay: :timer.minutes(10),
         every: :timer.hours(1)},
        id: :lfg_cleanup
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
