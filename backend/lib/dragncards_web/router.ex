defmodule DragnCardsWeb.Router do
  use DragnCardsWeb, :router

  pipeline :browser do
    plug(:accepts, ["html"])
    plug(:fetch_session)
    plug(:fetch_flash)
    plug(:protect_from_forgery)
    plug(:put_secure_browser_headers)
    #   plug Pow.Plug.Session, otp_app: :dragncards # If we want HTML Frontend Auth
  end

  pipeline :api do
    plug(:accepts, ["json"])
    plug(DragnCardsWeb.APIAuthPlug, otp_app: :dragncards)
  end

  pipeline :api_protected do
    plug(Pow.Plug.RequireAuthenticated, error_handler: DragnCardsWeb.APIAuthErrorHandler)
  end


  scope "/", DragnCardsWeb do
    pipe_through(:browser)

    get("/json_test", PageController, :json_test)
    #get("/", PageController, :index)
  end

  # Other scopes may use custom stacks.
  scope "/api", DragnCardsWeb do
    pipe_through(:api)
    post("/rooms/send_alert", RoomController, :send_alert)
    resources("/rooms", RoomController, except: [:new, :edit])
  end

  # Plugin Repo Update
  scope "/api", DragnCardsWeb do
    pipe_through(:api)
    post("/plugin-repo-update", PluginRepoUpdateController, :update)
  end

  scope "/api", DragnCardsWeb do
    pipe_through(:api)

    post("/replays/delete", ReplayController, :delete)
    resources("/replays/:user_id", ReplayController, except: [:new, :edit])

    get("/patreon/:code", PatreonController, :patreon_callback)

    # My plugins
    resources("/myplugins", MyPluginsController)

    # Custom Content
    get("/my_custom_content/:user_id/:plugin_id", CustomContentController, :get_my_public_and_private_card_dbs)
    get("/all_custom_content/:user_id/:plugin_id", CustomContentController, :get_all_public_and_my_private_card_dbs)
    resources("/custom_content", CustomContentController)

    # All plugins
    #get("/plugins/info/:plugin_id", PluginsController, :get_plugin_info)
    get("/plugins/visible/:plugin_id/:user_id", PluginsController, :get_visible_plugin)
    get("/plugins/visible/:user_id", PluginsController, :get_visible_plugins)
    get("/plugins/:plugin_id", PluginsController, :get_plugin)
    get("/plugins", PluginsController, :index)
  end

  scope "/api/v1", DragnCardsWeb.API.V1, as: :api_v1 do
    pipe_through(:api)

    # Sign up / Sign In
    resources("/registration", RegistrationController, singleton: true, only: [:create])
    resources("/session", SessionController, singleton: true, only: [:create, :delete])
    post("/session/renew", SessionController, :renew)

    # Confirm Email / Forgot Password
    resources("/confirm-email", ConfirmationController, only: [:show])
    post("/reset-password", ResetPasswordController, :create)
    post("/reset-password/update", ResetPasswordController, :update)

    # User data
    get("/users/plugin_permission/:plugin_id", UsersController, :fetch_plugin_permission)
    post("/users/plugin_permission/:plugin_id/:user_id", UsersController, :add_plugin_permission)
    delete("/users/plugin_permission/:plugin_id/:user_id", UsersController, :remove_plugin_permission)
    get("/users/all", UsersController, :fetch_all)

    # Profile
    get("/profile", ProfileController, :index)
    post("/profile/update", ProfileController, :update)
    post("/profile/update_plugin_user_settings", ProfileController, :update_plugin_user_settings)
    get("/profile/:id", ProfileController, :show)

    # reCAPTCHA verification
    post("/recaptcha/verify", RecaptchaController, :verify)

    # Admin Contact
    get("/admin_contact", AdminContactController, :index)

    # Create a game room
    post("/games", GameController, :create)

    # Decks
    resources("/decks", DeckController)
    get("/decks/:user_id/:plugin_id", DeckController, :get_decks)
    get("/public_decks/:plugin_id", DeckController, :get_public_decks)

    # Testing Junk
    get("/authtest", JunkController, :authtest)

    # Alerts
    get("/alerts", AlertController, :show)

  end

  # scope "/api/v1", DragnCardsWeb.API.V1, as: :api_v1 do
  #   pipe_through([:api, :api_protected])

  #   # Your protected API endpoints here
  # end

end
