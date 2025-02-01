defmodule DragnCardsWeb.API.V1.RegistrationController do
  use DragnCardsWeb, :controller

  alias Ecto.Changeset
  alias Plug.Conn

  @spec create(Conn.t(), map()) :: Conn.t()
  def create(conn, %{"user" => user_params}) do
    conn
    |> Pow.Plug.create_user(user_params)
    |> case do
      {:ok, user, conn} ->
        send_confirmation_email(user, conn)

        json(conn, %{
          data: %{
            token: conn.private[:api_auth_token],
            renew_token: conn.private[:api_renew_token]
          }
        })

      {:error, changeset, conn} ->

        conn
        |> put_status(500)
        |> json(%{error: %{status: 500, message: "Couldn't create user"}})
    end
  end

  _ = """
  *** Next two functions are copied and modified from
  ./lib/extensions/email_confirmation/phoenix/controllers/controller_callbacks.ex
  in the 'pow' library.
  REASON: Customize the url sent to include the front-end. ***
  """

  @doc """
  Sends a confirmation e-mail to the user.

  The user struct passed to the mailer will have the `:email` set to the
  `:unconfirmed_email` value if `:unconfirmed_email` is set.
  """
  @spec send_confirmation_email(map(), Conn.t()) :: any()
  def send_confirmation_email(user, conn) do
    url = confirmation_url(conn, user)
    unconfirmed_user = %{user | email: user.unconfirmed_email || user.email}
    email = PowEmailConfirmation.Phoenix.Mailer.email_confirmation(conn, unconfirmed_user, url)
    Pow.Phoenix.Mailer.deliver(conn, email)
  end

  defp confirmation_url(conn, user) do
    token = PowEmailConfirmation.Plug.sign_confirmation_token(conn, user)
    Application.get_env(:dragncards, DragnCardsWeb.Endpoint)[:front_end_email_confirm_url]
    |> String.replace("{token}", token)
  end
end
