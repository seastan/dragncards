defmodule DragnCardsWeb.APIAuthPlug do
  @moduledoc false
  use Pow.Plug.Base

  alias Plug.Conn
  alias Pow.{Config, Operations}

  @auth_salt "dragncards api auth"
  @renew_salt "dragncards api renew"
  @auth_max_age 1_800        # 30 minutes
  @renew_max_age 2_592_000   # 30 days

  @impl true
  @spec fetch(Conn.t(), Config.t()) :: {Conn.t(), map() | nil}
  def fetch(conn, config) do
    with token when is_binary(token) <- fetch_auth_token(conn),
         {:ok, user_id} <- verify_token(token, @auth_salt, @auth_max_age),
         user when not is_nil(user) <- Operations.get_by([id: user_id], config) do
      {conn, user}
    else
      _ -> {conn, nil}
    end
  end

  @impl true
  @spec create(Conn.t(), map(), Config.t()) :: {Conn.t(), map()}
  def create(conn, user, _config) do
    token = Phoenix.Token.sign(DragnCardsWeb.Endpoint, @auth_salt, user.id)
    renew_token = Phoenix.Token.sign(DragnCardsWeb.Endpoint, @renew_salt, user.id)

    conn =
      conn
      |> Conn.put_private(:api_auth_token, token)
      |> Conn.put_private(:api_renew_token, renew_token)

    {conn, user}
  end

  @impl true
  @spec delete(Conn.t(), Config.t()) :: Conn.t()
  def delete(conn, _config) do
    # Stateless tokens cannot be revoked server-side; the client discards them on logout.
    conn
  end

  @spec renew(Conn.t(), Config.t()) :: {Conn.t(), map() | nil}
  def renew(conn, config) do
    with renew_token when is_binary(renew_token) <- fetch_auth_token(conn),
         {:ok, user_id} <- verify_token(renew_token, @renew_salt, @renew_max_age),
         user when not is_nil(user) <- Operations.get_by([id: user_id], config) do
      create(conn, user, config)
    else
      _ -> {conn, nil}
    end
  end

  @spec fetch_from_token(Config.t(), String.t() | nil) :: map() | nil
  def fetch_from_token(config, token) do
    with true <- is_binary(token),
         {:ok, user_id} <- verify_token(token, @auth_salt, @auth_max_age),
         user when not is_nil(user) <- Operations.get_by([id: user_id], config) do
      user
    else
      _ -> nil
    end
  end

  defp verify_token(token, salt, max_age) do
    Phoenix.Token.verify(DragnCardsWeb.Endpoint, salt, token, max_age: max_age)
  end

  defp fetch_auth_token(conn) do
    conn
    |> Plug.Conn.get_req_header("authorization")
    |> List.first()
  end
end
