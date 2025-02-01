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

# Import environment specific config. This must remain at the bottom
# of this file so it overrides the configuration defined above.
import_config "#{Mix.env()}.exs"
