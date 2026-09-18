import Config

# Runtime configuration. In a release this file is evaluated at boot, so these
# values come from the systemd unit's Environment= lines rather than from
# whatever happened to be set on the build machine.
#
# This exists because beta.dragncards.com and dragncards.com are separate hosts
# with separate upload volumes and separate hostnames:
#
#   beta:  UPLOADS_ROOT=/mnt/beta_uploads
#          UPLOADS_PUBLIC_BASE_URL=https://beta.dragncards.com/uploads
#   prod:  UPLOADS_ROOT=/mnt/uploads
#          UPLOADS_PUBLIC_BASE_URL=https://dragncards.com/uploads
#
# Both must be set for image hosting to switch on. If either is missing the
# feature reports itself as unconfigured and refuses uploads, rather than
# guessing. Guessing would be actively harmful: a wrong UPLOADS_PUBLIC_BASE_URL
# on beta would bake production URLs into beta testers' plugins, and a wrong
# UPLOADS_ROOT would write to the wrong volume.
if config_env() == :prod do
  # --- Settings that used to live in config/releases.exs ----------------------
  #
  # Adding this file made the release ignore config/releases.exs entirely (a
  # release evaluates runtime.exs instead, and cannot import other config files).
  # Anything only that file provided has to be restored here, or the release
  # boots with no HTTP listener and mail silently stops working.
  #
  # server: true is what makes a release start the endpoint at all; without it
  # the app runs, keeps its scheduled jobs, and serves nothing.
  # PORT is per-instance and is what blue-green deploys switch between, so it
  # must come from the environment rather than from prod.exs.
  config :dragncards, DragnCardsWeb.Endpoint,
    server: true,
    http: [port: String.to_integer(System.get_env("PORT") || "4000")]

  # Mail. Configured only when credentials are present, so a host without them
  # fails loudly at send time rather than appearing to work.
  mailgun_api_key = System.get_env("MAILGUN_API_KEY")
  mailgun_domain = System.get_env("MAILGUN_DOMAIN")

  if mailgun_api_key not in [nil, ""] and mailgun_domain not in [nil, ""] do
    for mailer <- [DragnCards.Mailer, DragnCardsWeb.PowMailer] do
      config :dragncards, mailer,
        adapter: Swoosh.Adapters.Mailgun,
        api_key: mailgun_api_key,
        domain: mailgun_domain
    end
  else
    IO.puts(:stderr, """
    [mail] MAILGUN_API_KEY / MAILGUN_DOMAIN are not set, so no mail adapter is \
    configured. Password resets and email confirmations will fail.\
    """)
  end

  # Database URL, if the environment provides one. Otherwise the build-time
  # config (config/prod.secret.exs) applies, which is where it came from before.
  database_url = System.get_env("DATABASE_URL")

  if database_url not in [nil, ""] do
    config :dragncards, DragnCards.Repo,
      url: database_url,
      pool_size: String.to_integer(System.get_env("POOL_SIZE") || "10")
  end

  # --- Plugin image hosting ---------------------------------------------------
  uploads_root = System.get_env("UPLOADS_ROOT")
  uploads_base_url = System.get_env("UPLOADS_PUBLIC_BASE_URL")

  configured? =
    is_binary(uploads_root) and uploads_root != "" and
      is_binary(uploads_base_url) and uploads_base_url != ""

  unless configured? do
    IO.puts(:stderr, """
    [uploads] Plugin image hosting is DISABLED: UPLOADS_ROOT and/or \
    UPLOADS_PUBLIC_BASE_URL are not set. Add both to this host's systemd unit \
    to enable it.\
    """)
  end

  config :dragncards, :uploads,
    enabled: configured?,
    root: uploads_root,
    # Stored without a trailing slash; Paths.public_url/2 adds the separators.
    public_base_url: uploads_base_url && String.trim_trailing(uploads_base_url, "/"),
    serve_locally: false,
    free_space_floor_bytes:
      String.to_integer(System.get_env("UPLOADS_FREE_SPACE_FLOOR_BYTES") || "1073741824")
end
