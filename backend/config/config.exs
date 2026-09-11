# This file is responsible for configuring your application
# and its dependencies with the aid of the Mix.Config module.
#
# This configuration file is loaded before any dependency and
# is restricted to this project.

# General application configuration
import Config

config :dragncards, :env_mode, :default

config :dragncards,
  ecto_repos: [DragnCards.Repo]

config :dragncards, :pow,
  user: DragnCards.Users.User,
  repo: DragnCards.Repo,
  extensions: [PowEmailConfirmation, PowResetPassword],
  controller_callbacks: Pow.Extension.Phoenix.ControllerCallbacks,
  mailer_backend: DragnCardsWeb.PowMailer,
  cache_store_backend: Pow.Store.Backend.MnesiaCache

# Configures the endpoint
config :dragncards, DragnCardsWeb.Endpoint,
  url: [host: "127.0.0.1"],
  #url: [host: "localhost"],
  secret_key_base: "8fqaEQYF++61y9MByi3t+TE2+VGFuEQFfhrlBkzliKpM+1Vi5roQ3arQHNk7uRwi",
  render_errors: [view: DragnCardsWeb.ErrorView, accepts: ~w(html json)],
  pubsub_server: DragnCards.PubSub

# Configures Elixir's Logger
config :logger, :console,
  format: "$time $metadata[$level] $message\n",
  metadata: [:request_id]
  #level: :warning

# Use Jason for JSON parsing in Phoenix
config :phoenix, :json_library, Jason

# Use tz library for timezone database
config :elixir, :time_zone_database, Tz.TimeZoneDatabase

# User-uploaded plugin images.
#
# :root and :public_base_url are environment-specific and are overridden at boot
# by config/runtime.exs from UPLOADS_ROOT / UPLOADS_PUBLIC_BASE_URL, because
# beta and production are separate hosts with separate volumes
# (/mnt/beta_uploads vs /mnt/uploads). Everything else below is the same
# everywhere and is safe to bake in at build time.
config :dragncards, :uploads,
  enabled: false,
  root: nil,
  public_base_url: nil,
  serve_locally: false,
  transcoder: DragnCards.Images.Transcoder.Vix,
  transcode_timeout_ms: 20_000,
  # Refuse ALL uploads when the volume drops below this much free space.
  free_space_floor_bytes: 1_073_741_824,
  max_source_bytes: 20_000_000,
  max_source_pixels: 40_000_000,
  max_files_per_request: 40,
  max_path_depth: 8,
  prune_grace_days: 60,
  profiles: %{
    "cards" => %{max_dim: 900, quality: 80, keep_alpha: false},
    "backgrounds" => %{max_dim: 1920, quality: 80, keep_alpha: false},
    "tokens" => %{max_dim: 400, quality: 90, keep_alpha: true}
  },
  # {minimum supporter_level, limits}, highest first. Mirrors the shape of
  # timeout_for_supporter_level/1 in game_ui_server.ex.
  tiers: [
    {10, %{max_files: 10_000, max_bytes: 3_221_225_472}},
    {5, %{max_files: 5_000, max_bytes: 1_610_612_736}},
    {3, %{max_files: 1_000, max_bytes: 314_572_800}},
    {0, %{max_files: 100, max_bytes: 31_457_280}}
  ]

# Import environment specific config. This must remain at the bottom
# of this file so it overrides the configuration defined above.
import_config "#{Mix.env()}.exs"
