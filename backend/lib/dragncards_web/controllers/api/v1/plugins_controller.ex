defmodule Compress do
  @spec gzip(term()) :: binary()
  def gzip(data) when is_binary(data) do
    :zlib.gzip(data)
  end
end


defmodule DragnCardsWeb.PluginsController do
  use DragnCardsWeb, :controller

  alias DragnCards.{Plugins, Plugins.Plugin, Repo}

  action_fallback DragnCardsWeb.FallbackController

  def index(conn, _params) do
    user = Pow.Plug.current_user(conn)
    user_id = if user != nil do
      user.id
    else
      0
    end
    plugins = Plugins.list_plugins_info(user_id)
    render(conn, "index.json", plugins: plugins)
    #json(conn, %{plugins: nil})
  end

  def get_visible_plugins(conn, %{"user_id" => user_id}) do
    plugins = Plugins.list_plugins_info(user_id)
    render(conn, "index.json", plugins: plugins)
  end

  @spec show(Conn.t(), map()) :: Conn.t()
  def show(conn, %{"plugin_id" => _plugin_id}) do
    conn
  end

  def get_visible_plugin(conn, %{"user_id" => user_id, "plugin_id" => plugin_id}) do
    #{plugin_id, ""} = Integer.parse(params["plugin_id"])
    case Plugins.get_plugin_info(plugin_id, user_id) do
      nil ->
        conn
        |> put_status(404)
        |> json(%{error: %{code: 404, message: "Not Found"}})
      plugin ->
        render(conn, "single_info.json", plugin: plugin)
    end

  end

  def get_plugin(conn, params) do
    {plugin_id, ""} = Integer.parse(params["plugin_id"])
    plugin = Repo.get_by(Plugin, id: plugin_id)

    original_data = Jason.encode!(plugin)
    compressed_data = Jason.encode!(:base64.encode(Compress.gzip(original_data)))

    conn
    |> send_resp(200, compressed_data)

  end

  def get_plugin_raw(conn, params) do
    {plugin_id, ""} = Integer.parse(params["plugin_id"])
    plugin = Repo.get_by(Plugin, id: plugin_id)

    original_data = Jason.encode!(plugin)

    conn
    |> send_resp(200, original_data)

  end

  # def get_plugin(conn, params) do
  #   IO.puts("get_plugin 1")
  #   IO.inspect(params)
  #   {plugin_id, ""} = Integer.parse(params["plugin_id"])
  #   IO.puts("get_plugin 2")
  #   IO.inspect(plugin_id)
  #   plugin = Repo.get_by(Plugin, id: plugin_id)

  #   original_data = Jason.encode!(plugin)
  #   compressed_data = Compress.gzip(original_data)

  #   # Measure sizes
  #   original_size = byte_size(original_data)
  #   compressed_size = byte_size(compressed_data)
  #   IO.puts("Original size: #{original_size} bytes")
  #   IO.puts("Compressed size: #{compressed_size} bytes")

  #   response_data = %{
  #     "original_data" => original_data,
  #     "compressed_data" => :base64.encode(compressed_data)
  #   }

  #   json_response = Jason.encode!(response_data)

  #   conn
  #   |> send_resp(200, json_response)
  # end

  # def get_plugin_info(conn, params) do
  #   {plugin_id, ""} = Integer.parse(params["plugin_id"])
  #   plugin = Plugins.get_plugin_info(plugin_id)
  #   render(conn, "single_info.json", plugin: plugin)

  #   #plugins = Plugins.list_plugins_info()
  #   #render(conn, "index.json", plugins: plugins)
  # end

end
