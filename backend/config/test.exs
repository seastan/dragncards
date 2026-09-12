import Config

config :dragncards, :pow,
  user: DragnCards.Users.User,
  repo: DragnCards.Repo

config :dragncards, DragnCards.Mailer, adapter: Swoosh.Adapters.Test
config :dragncards, DragnCardsWeb.PowMailer, adapter: Swoosh.Adapters.Test

# Configure your database
config :dragncards, DragnCards.Repo,
  username: "postgres",
  password: "postgres",
  database: "dragncards_dev_copy",
  hostname: "localhost",
  pool: Ecto.Adapters.SQL.Sandbox

# We don't run a server during test. If one is required,
# you can enable the server option below.
config :dragncards, DragnCardsWeb.Endpoint,
  http: [port: 4002],
  server: false,
  front_end_email_confirm_url: "http://localhost:3000/confirm-email/{token}",
  front_end_reset_password_url: "http://localhost:3000/reset-password/{token}"

# Plugin image hosting. Tests write into a tmp tree that each test case creates
# and tears down; :root just has to be a real, writable, absolute path.
config :dragncards, :uploads,
  enabled: true,
  root: Path.expand("../priv/uploads_test", __DIR__),
  public_base_url: "http://localhost:4002/uploads",
  serve_locally: false,
  free_space_floor_bytes: 0

# Print only warnings and errors during test
config :logger, level: :warn
