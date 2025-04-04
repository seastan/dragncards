defmodule DragnCardsWeb.API.V1.SessionController do
  use DragnCardsWeb, :controller

  alias DragnCardsWeb.APIAuthPlug
  alias Plug.Conn

  @spec create(Conn.t(), map()) :: Conn.t()
  def create(conn, %{"user" => user_params}) do
    IO.puts("session create 1")
    conn = conn
    |> Pow.Plug.authenticate_user(user_params)
    |> case do
      {:ok, conn} ->
        json(conn, %{
          data: %{
            token: conn.private[:api_auth_token],
            renew_token: conn.private[:api_renew_token]
          }
        })

      {:error, conn} ->
        conn
        |> put_status(401)
        |> json(%{error: %{status: 401, message: "Invalid email or password"}})
    end

    IO.puts("session create 2")
    conn
  end

  @spec renew(Conn.t(), map()) :: Conn.t()
  def renew(conn, _params) do
    config = Pow.Plug.fetch_config(conn)

    IO.puts("session renew 1")
    # config |> IO.inspect(label: "config")

    conn = conn
    |> APIAuthPlug.renew(config)
    |> case do
      {conn, nil} ->
        # "Invalid token" |> IO.inspect()
        IO.puts("session renew fail")
        IO.inspect(conn)
        IO.inspect(config)
        conn
        |> put_status(401)
        |> json(%{error: %{status: 401, message: "Invalid token"}})

      {conn, _user} ->
        IO.puts("session renew success")
        IO.inspect(conn)
        json(conn, %{
          data: %{
            token: conn.private[:api_auth_token],
            renew_token: conn.private[:api_renew_token]
          }
        })
    end
    IO.puts("session renew 2")
    conn
  end

  @spec delete(Conn.t(), map()) :: Conn.t()
  def delete(conn, _params) do
    IO.puts("session delete 1")
    conn
    |> Pow.Plug.delete()
    |> json(%{data: %{}})
  end
end
