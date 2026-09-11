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
