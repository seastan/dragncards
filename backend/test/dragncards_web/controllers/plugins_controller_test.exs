defmodule DragnCardsWeb.PluginControllerTest do
  use DragnCardsWeb.ConnCase
  alias DragnCards.{Plugins, Plugins.Plugin, Repo}
  alias DragnCards.Users.User

  setup do
    user_params = %{
      email: "testemail@gmail.com",
      password: "testpassword",
      password_confirmation: "testpassword",
      alias: "testalias",
    }

    user = DragnCards.Users.User.changeset(%DragnCards.Users.User{}, user_params) |> Repo.insert!()
    # Create a plugin and save it to the database

    {:ok, plugin} = %{
      "name" => "test name",
      "author_id" => user.id,
      "game_def" => %{},
      "card_db" => %{},
      "public" => true
    } |> Plugins.create_plugin()

    # Return the plugin as test context
    {:ok, plugin: plugin}
  end

  test "get_plugin returns the plugin as JSON", %{conn: conn, plugin: plugin} do
    # Make a request to the endpoint that calls the get_plugin function
    IO.inspect(plugin)
    conn = get(conn, Routes.plugins_path(conn, :get_plugin, plugin.id))

    # Check if the response has a 200 status code
    assert conn.status == 200

    # Check if the response's content type is "application/json"
    assert get_resp_header(conn, "content-type") == ["application/json; charset=utf-8"]

    # Parse the response body as JSON
    response_body = Jason.decode!(conn.resp_body)
    IO.inspect(response_body, label: "response_body")

    # Check if the response contains the expected plugin data
    assert response_body["id"] == plugin.id
    # Add more assertions based on the expected plugin structure in the response
  end
end
