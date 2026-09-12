defmodule DragnCardsWeb.Endpoint do
  use Phoenix.Endpoint, otp_app: :dragncards

  socket "/socket", DragnCardsWeb.UserSocket,
    websocket: true,
    longpoll: false

  # Serve at "/" the static files from "priv/static" directory.
  #
  # You should set gzip to true if you are running phx.digest
  # when deploying your static files in production.
  plug Plug.Static,
    at: "/",
    from: :dragncards,
    gzip: false,
    only: ~w(css fonts images js favicon.ico robots.txt)

  # Dev-only equivalent of the nginx /uploads/ block. In production nginx serves
  # the upload volume directly and this never runs, so dev and prod differ only
  # in who reads the file off disk.
  #
  # only: ~w(u) restricts this to /uploads/u/..., leaving tmp/ and quarantine/
  # unreachable even in dev. Options are read at runtime because dev.exs sets
  # plug_init_mode: :runtime, which avoids an Application.compile_env conflict
  # with the same keys being set at boot by config/runtime.exs in production.
  if Application.compile_env(:dragncards, [:uploads, :serve_locally], false) do
    plug Plug.Static,
      at: "/uploads",
      from: {DragnCardsWeb.Endpoint, :uploads_root, []},
      gzip: false,
      only: ~w(u),
      cache_control_for_etags: "public, max-age=86400",
      headers: %{
        "access-control-allow-origin" => "*",
        "x-content-type-options" => "nosniff"
      }
  end

  @doc false
  def uploads_root do
    :dragncards |> Application.get_env(:uploads, []) |> Keyword.get(:root) || "priv/uploads_dev"
  end

  # Code reloading can be explicitly enabled under the
  # :code_reloader configuration of your endpoint.
  if code_reloading? do
    socket "/phoenix/live_reload/socket", Phoenix.LiveReloader.Socket
    plug Phoenix.LiveReloader
    plug Phoenix.CodeReloader
  end

  plug Plug.RequestId
  plug Plug.Telemetry, event_prefix: [:phoenix, :endpoint]

  plug Plug.Parsers,
    parsers: [:urlencoded, :multipart, :json],
    pass: ["*/*"],
    json_decoder: Phoenix.json_library(),
    length: 80_000_000

  plug Plug.MethodOverride
  plug Plug.Head

  # The session will be stored in the cookie and signed,
  # this means its contents can be read but not tampered with.
  # Set :encryption_salt if you would also like to encrypt it.
  plug Plug.Session,
    store: :cookie,
    key: "_dragncards_key",
    signing_salt: "4mzmXX6h"

  plug DragnCardsWeb.Router
end
