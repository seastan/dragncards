defmodule DragnCardsWeb.APIAuthPlug do
  @moduledoc false
  use Pow.Plug.Base

  alias Plug.Conn
  alias Pow.{Config, Store.CredentialsCache}
  alias PowPersistentSession.Store.PersistentSessionCache

  @impl true
  @spec fetch(Conn.t(), Config.t()) :: {Conn.t(), map() | nil}
  def fetch(conn, config) do
    token = fetch_auth_token(conn)

    config
    |> store_config()
    |> CredentialsCache.get(token)
    |> case do
      :not_found -> {conn, nil}
      {user, _metadata} -> {conn, user}
    end
  end

  @impl true
  @spec create(Conn.t(), map(), Config.t()) :: {Conn.t(), map()}
  def create(conn, user, config) do
    store_config = store_config(config)
    token = Pow.UUID.generate()
    renew_token = Pow.UUID.generate()

    conn =
      conn
      |> Conn.put_private(:api_auth_token, token)
      |> Conn.put_private(:api_renew_token, renew_token)

    CredentialsCache.put(store_config, token, {user, []})
    PersistentSessionCache.put(store_config, renew_token, {[id: user.id], []})

    {conn, user}
  end

  @impl true
  @spec delete(Conn.t(), Config.t()) :: Conn.t()
  def delete(conn, config) do
    token = fetch_auth_token(conn)

    config
    |> store_config()
    |> CredentialsCache.delete(token)

    conn
  end

  @doc """
  Create a new token with the provided authorization token.

  The renewal authorization token will be deleted from the store after the user id has been fetched.
  """
  @spec renew(Conn.t(), Config.t()) :: {Conn.t(), map() | nil}
  def renew(conn, config) do
    renew_token = fetch_auth_token(conn)
    store_config = store_config(config)
    IO.puts("api_auth_plug renew")
    IO.inspect(renew_token)
    IO.inspect(store_config)

    res = PersistentSessionCache.get(store_config, renew_token)
    IO.puts("api_auth_plug res")
    IO.inspect(res)

    PersistentSessionCache.delete(store_config, renew_token)

    case res do
      :not_found -> {conn, nil}
      res -> load_and_create_session(conn, res, config)
    end
  end

  @doc """
  Used by Websocket / Made by Matt, probably not right
  """
  @spec fetch_from_token(Config.t(), String.t()) :: map() | nil
  def fetch_from_token(config, token) do
    config
    |> store_config()
    |> CredentialsCache.get(token)
    |> case do
      :not_found -> nil
      {user, _metadata} -> user
    end
  end

  defp load_and_create_session(conn, {clauses, _metadata}, config) do
    case Pow.Operations.get_by(clauses, config) do
      nil -> {conn, nil}
      user -> create(conn, user, config)
    end
  end

  defp fetch_auth_token(conn) do
    conn
    |> Plug.Conn.get_req_header("authorization")
    |> List.first()
  end

  defp store_config(config) do
    backend = Config.get(config, :cache_store_backend, Pow.Store.Backend.EtsCache)

    [backend: backend]
  end
end
