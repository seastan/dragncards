defmodule DragnCardsWeb.CustomContentController do
  alias DragnCards.Plugins.CustomCardDb
  use DragnCardsWeb, :controller
  import Ecto.Query

  alias DragnCards.{Plugins, Plugins.Plugin, Repo, Users}

  action_fallback DragnCardsWeb.FallbackController

  def show(conn, %{"id" => plugin_id}) do

    IO.inspect(conn)
    user = conn.assigns.current_user
    case user do
      nil ->
        conn |> json(%{error: %{message: "User not found"}})
      _ ->
        {public_card_db, private_card_db} = CustomCardDb.get_custom_card_db(plugin_id, user.id)
        IO.puts("Public card db")
        IO.inspect(public_card_db)
        IO.puts("Private card db")
        IO.inspect(private_card_db)
        conn |> json(%{success: %{message: "User found"}, public_card_db: public_card_db, private_card_db: private_card_db})
    end
  end

  def get_my_public_and_private_card_dbs(conn, %{"user_id" => user_id, "plugin_id" => plugin_id}) do
    cond do
      user_id == nil ->
        conn |> json(%{error: %{message: "User not found"}})
      plugin_id == nil ->
        conn |> json(%{error: %{message: "Plugin not found"}})
      true ->
        {public_card_db, private_card_db} = CustomCardDb.get_my_public_and_private_card_dbs(user_id, plugin_id)
        conn |> json(%{success: %{message: "User found"}, public_card_db: public_card_db, private_card_db: private_card_db})
    end
  end

  def get_all_public_and_my_private_card_dbs(conn, %{"user_id" => user_id, "plugin_id" => plugin_id}) do
    cond do
      user_id == nil ->
        conn |> json(%{error: %{message: "User not found"}})
      plugin_id == nil ->
        conn |> json(%{error: %{message: "Plugin not found"}})
      true ->
        {public_card_db, private_card_db} = CustomCardDb.get_all_public_and_my_private_card_dbs(user_id, plugin_id)
        conn |> json(%{success: %{message: "User found"}, public_card_db: public_card_db, private_card_db: private_card_db})
    end
  end

  @spec create(Conn.t(), map()) :: Conn.t()
  def create(conn, attrs) do
    IO.puts("Creating custom cards 1")
    IO.inspect(attrs["plugin_id"])
    IO.puts("Creating custom cards 2")
    plugin_id = attrs["plugin_id"]
    author_id = attrs["author_id"]
    author_alias = Users.get_alias(author_id)
    public = attrs["public"]
    card_db = attrs["card_db"]
    public_bool = if public do 1 else 0 end

    # Prepend "custom-{author_id} to each key in card_db
    card_db = Enum.reduce(card_db, %{}, fn({database_id, card_details}, acc) ->
      new_id = "author_id-#{author_id}-#{database_id}"
      acc
      |> put_in([new_id], card_details)
      |> put_in([new_id, "author_id"], author_id)
      |> put_in([new_id, "author_alias"], author_alias)
    end)

    new_attrs = %{
      "plugin_id" => plugin_id,
      "author_id" => author_id,
      "public" => public,
      "card_db" => card_db
    }

    # If a custom card db already exists with the same plugin_id, author_id, and public, delete it
    from(x in CustomCardDb, where: x.plugin_id == ^plugin_id and x.author_id == ^author_id and x.public == ^public) |> Repo.delete_all
    IO.puts("Creating custom cards 3")

    case CustomCardDb.create_custom_card_db(new_attrs) do
      {:ok, attrs} ->
        IO.puts("Creating custom cards 4")
        conn
        |> json(%{success: %{message: "Custom cards created successfully"}, data: attrs})
      {:error, _changeset} ->
        IO.puts("Creating custom cards 5")
        conn
        |> json(%{error: %{message: "Failed to write custom cards to server."}})
    end
  end

  # Update: Update plugin
  @spec delete(Conn.t(), map()) :: Conn.t()
  def delete(conn, %{"id" => plugin_id}) do
    user = Pow.Plug.current_user(conn)
    plugin = Repo.one(from p in Plugin, select: [:id], where: p.id == ^plugin_id)
    plugin_id = plugin.id
    user_id = user.id
    from(x in Plugin, where: x.id == ^plugin_id and x.author_id == ^user_id) |> Repo.delete_all
    conn
    |> json(%{success: %{message: "Updated settings"}})
  end
end
