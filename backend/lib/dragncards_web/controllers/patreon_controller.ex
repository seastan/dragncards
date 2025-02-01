defmodule DragnCardsWeb.PatreonController do
  alias DBConnection.App
  use DragnCardsWeb, :controller
  alias DragnCards.{Users, Repo, Users.User}
  alias Plug.Conn

  # def patreon_callback(conn, params) do
  #   IO.puts("here =============================================================================================================")
  #   IO.inspect(params)
  # end

  def patreon_callback(conn, %{"code" => code}) do
    IO.puts("here =============================================================================================================")
    IO.inspect(code)
    IO.inspect(conn.assigns)
    token = request_access_token(code)
    IO.puts("----------------------------- patreon callback 1")
    profile = fetch_user_profile(token)
    # If the profile contains a data field then the token is valid
    # Otherwise, the token is invalid
    case profile do
      %{"data" => _} ->
        IO.puts("----------------------------- patreon callback 2")
        IO.inspect(profile)
        case get_level_from_profile(profile) do
          {:error, reason} ->
            conn
            |> json(%{error: %{message: "Failed to get supporter level"}})
          {:ok, supporter_level} ->
            IO.puts("----------------------------- patreon callback 3")
            IO.inspect(supporter_level)
            update_user_supporter_level(conn, supporter_level)
        end
      _ ->
        conn
        |> json(%{error: %{message: "Failed to get profile data."}})

    end
  end

  defp request_access_token(code) do
    IO.puts("----------------------------- request_access_token 1")
    # Get client secret from environment variable fromprod.exs
    patreon_client_id = Application.get_env(:dragncards, :patreon_client_id)
    patreon_client_secret = Application.get_env(:dragncards, :patreon_client_secret)
    patreon_redirect_uri = Application.get_env(:dragncards, :patreon_redirect_uri)
    IO.inspect(patreon_client_id)
    IO.inspect(patreon_client_secret)
    IO.inspect(patreon_redirect_uri)
    body = [
      {"code", code},
      {"grant_type", "authorization_code"},
      {"client_id", patreon_client_id},
      {"client_secret", patreon_client_secret},
      {"redirect_uri", patreon_redirect_uri}
    ]
    |> URI.encode_query()
    IO.puts("----------------------------- request_access_token 2")

    headers = [{"Content-Type", "application/x-www-form-urlencoded"}]
    http_response = HTTPoison.post("https://www.patreon.com/api/oauth2/token", body, headers)
    IO.inspect(http_response)

    case http_response do
      {:ok, %HTTPoison.Response{body: body}} ->
        IO.puts("----------------------------- request_access_token 3")
        IO.inspect(body)
        res = Poison.decode!(body)
        res["access_token"]
      {:error, %HTTPoison.Error{reason: reason}} ->
        IO.puts("----------------------------- request_access_token 3b")
        IO.puts("HTTP Request failed: #{inspect reason}")
        nil
    end
  end


  def fetch_user_profile(access_token) do
    IO.puts("----------------------------- fetch_user_profile 0")
    headers = [{"Authorization", "Bearer #{access_token}"}]
    case HTTPoison.get("https://www.patreon.com/api/oauth2/v2/identity?include=memberships&fields%5Bmember%5D=currently_entitled_amount_cents", headers) do
    #case HTTPoison.get("https://www.patreon.com/api/oauth2/v2/identity?include=memberships.campaign&fields%5Bmember%5D=currently_entitled_amount_cents&fields%5Bcampaign%5D=id,name", headers) do
      {:ok, response} ->
        IO.puts("----------------------------- fetch_user_profile 1")
        # Assuming you want to work with the response body as a string
        response_body = response.body
        IO.puts("response_body")
        IO.inspect(response_body)
        Poison.decode!(response_body)
      {:error, _error} ->
        nil
    end
  end

  def get_level_from_profile(profile) do
    case get_member_map() do
      nil ->
        {:erorr, "Failed to get campaign info"}
      member_map ->
        {:ok, get_level_from_profile_with_map(profile, member_map)}
    end
  end

  def get_level_from_profile_with_map(profile, member_map) do
    included = Map.get(profile, "included", [])
    Enum.reduce(included, 0, fn x, acc ->
      id = Map.get(x, "id")
      member = Map.get(member_map, id)
      IO.puts("id = #{id}, member = #{inspect member}")
      if member do
        amount_cents = get_in(member, ["attributes", "currently_entitled_amount_cents"])
        IO.puts("Member is in map! amount_cents = #{inspect amount_cents}")
        if amount_cents do
          amount_cents / 100.0 |> ceil()
        else
          acc
        end
      else
        acc
      end
    end)
  end

  def update_user_supporter_level(conn, supporter_level) do
    # Update user
    user_id = conn.assigns.current_user.id
    IO.puts("----------------------------- patreon callback 4")
    IO.inspect(user_id)

    user = Repo.get!(User, user_id)
    updates = %{
      supporter_level: supporter_level
    }
    user = Ecto.Changeset.change(user, updates)
    case Repo.update(user) do
      {:ok, _struct}       -> # Updated with success
        Pow.Plug.update_user(conn, %{}) # Refresh the session
        conn
        |> json(%{success: %{message: "Linked Patreon account", supporter_level: supporter_level}})
      {:error, _changeset} -> # Something went wrong
        conn
        |> json(%{error: %{message: "Failed to link Patreon account"}})
    end
  end

  def get_member_map() do
    creator_token = Application.get_env(:dragncards, :patreon_creator_token)
    headers = [{"Authorization", "Bearer #{creator_token}"}]
    case HTTPoison.get("https://www.patreon.com/api/oauth2/v2/campaigns/6913198/members?fields%5Bmember%5D=full_name,email,currently_entitled_amount_cents&page%5Bsize%5D=5000", headers) do
      {:ok, response} ->
        # Assuming you want to work with the response body as a string
        response_body = response.body |> Poison.decode!()
        data = Map.get(response_body, "data", [])
        Enum.reduce(data, %{}, fn x, acc ->
          id = Map.get(x, "id")
          acc |> Map.put(id, x)
        end)
      {:error, _error} ->
        nil
    end

  end

end
