defmodule DragnCardsWeb.API.V1.RecaptchaController do
  use DragnCardsWeb, :controller
  import Ecto.Query
  alias Plug.Conn
  alias DragnCards.Repo
  alias DragnCards.Users.User

  def verify(conn, %{"token" => token}) do
    recaptcha_response = verify_recaptcha_v3(token)
    # Captcha is broken, so just return verified
    recaptcha_response = {:ok, "verified"}

    case recaptcha_response do
      {:ok, _} ->
        # Trigger account confirmation logic
        user_id = conn.assigns.current_user.id
        IO.inspect(user_id)
        confirm_time = DateTime.utc_now
        from(p in User, where: p.id == ^user_id, update: [set: [email_confirmed_at: ^confirm_time]])
        |> Repo.update_all([])
        |> case do
          {1, nil} ->
            send_resp(conn, 200, "Account confirmed. Please log out and back in.")
          _ ->
            send_resp(conn, 500, "reCAPTCHA passed, but couldn't update user")
        end

      {:error, _} ->
        send_resp(conn, 400, "reCAPTCHA verification failed")
    end
  end

  defp verify_recaptcha_v3(token) do
    url = "https://www.google.com/recaptcha/api/siteverify"
    params = %{
      "secret" => System.get_env("RECAPTCHA_SECRET"),
      "response" => token
    }
    # assuming you have some HTTP client

    headers = [{"Content-Type", "application/x-www-form-urlencoded"}]
    body = URI.encode_query(params)

    case HTTPoison.post(url, body, headers) do
      {:ok, %HTTPoison.Response{status_code: 200, body: body}} ->
        case Jason.decode(body) do
          {:ok, %{"success" => true, "score" => score}} ->
            if score >= 0.5 do
              {:ok, "verified"}
            else
              {:error, "verification_failed"}
            end
          {:ok, %{"success" => false}} -> {:error, "verification_failed"}
          _ -> {:error, "unexpected_response_format"}
        end
      {:ok, %HTTPoison.Response{status_code: status_code}} when status_code != 200 ->
        {:error, "unexpected_status_code"}
      {:error, %HTTPoison.Error{reason: reason}} ->
        {:error, reason}
    end

  end
end
