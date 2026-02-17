defmodule DragnCardsWeb.API.V1.LfgController do
  use DragnCardsWeb, :controller

  alias DragnCards.Lfg

  def index(conn, %{"plugin_id" => plugin_id}) do
    posts = Lfg.list_active_posts(String.to_integer(plugin_id))
    json(conn, %{posts: posts})
  end

  def create(conn, %{"post" => post_params}) do
    user = Pow.Plug.current_user(conn)

    case user do
      nil ->
        conn
        |> put_status(401)
        |> json(%{error: %{code: 401, message: "Not authenticated"}})

      _ ->
        case Lfg.create_post(user, post_params) do
          {:ok, post} ->
            conn
            |> put_status(:created)
            |> json(%{success: %{message: "LFG post created", post: post}})

          {:error, :too_many_posts} ->
            conn
            |> put_status(422)
            |> json(%{error: %{message: "You can have at most 5 active LFG posts at a time."}})

          {:error, changeset} ->
            conn
            |> put_status(422)
            |> json(%{error: %{message: "Failed to create LFG post", errors: format_errors(changeset)}})
        end
    end
  end

  def delete(conn, %{"id" => id}) do
    user = Pow.Plug.current_user(conn)

    case user do
      nil ->
        conn
        |> put_status(401)
        |> json(%{error: %{code: 401, message: "Not authenticated"}})

      _ ->
        case Lfg.delete_post(String.to_integer(id), user) do
          {:ok, :deleted} ->
            json(conn, %{success: %{message: "LFG post deleted"}})

          {:error, :not_found} ->
            conn |> put_status(404) |> json(%{error: %{message: "Post not found"}})

          {:error, :unauthorized} ->
            conn |> put_status(403) |> json(%{error: %{message: "Not authorized"}})
        end
    end
  end

  def respond(conn, %{"post_id" => post_id, "earliest_start" => earliest_start}) do
    user = Pow.Plug.current_user(conn)

    case user do
      nil ->
        conn
        |> put_status(401)
        |> json(%{error: %{code: 401, message: "Not authenticated"}})

      _ ->
        case Lfg.respond_to_post(String.to_integer(post_id), user, earliest_start) do
          {:ok, :joined} ->
            json(conn, %{success: %{message: "Joined LFG post"}})

          {:error, :not_found} ->
            conn |> put_status(404) |> json(%{error: %{message: "Post not found"}})

          {:error, :not_open} ->
            conn |> put_status(422) |> json(%{error: %{message: "Post is no longer open"}})

          {:error, :own_post} ->
            conn |> put_status(422) |> json(%{error: %{message: "Cannot join your own post"}})

          {:error, _changeset} ->
            conn |> put_status(422) |> json(%{error: %{message: "Failed to join post"}})
        end
    end
  end

  def cancel_response(conn, %{"post_id" => post_id}) do
    user = Pow.Plug.current_user(conn)

    case user do
      nil ->
        conn
        |> put_status(401)
        |> json(%{error: %{code: 401, message: "Not authenticated"}})

      _ ->
        case Lfg.cancel_response(String.to_integer(post_id), user) do
          {:ok, :left} ->
            json(conn, %{success: %{message: "Left LFG post"}})

          {:error, :not_found} ->
            conn |> put_status(404) |> json(%{error: %{message: "Response not found"}})
        end
    end
  end

  def subscribe(conn, %{"plugin_id" => plugin_id}) do
    user = Pow.Plug.current_user(conn)
    IO.inspect(user, label: "LFG subscribe user")

    case user do
      nil ->
        conn
        |> put_status(401)
        |> json(%{error: %{code: 401, message: "Not authenticated"}})

      _ ->
        case Lfg.subscribe(user.id, String.to_integer(plugin_id)) do
          {:ok, _sub} ->
            json(conn, %{success: %{message: "Subscribed to LFG notifications"}})

          {:error, _} ->
            json(conn, %{success: %{message: "Already subscribed"}})
        end
    end
  end

  def unsubscribe(conn, %{"plugin_id" => plugin_id}) do
    user = Pow.Plug.current_user(conn)

    case user do
      nil ->
        conn
        |> put_status(401)
        |> json(%{error: %{code: 401, message: "Not authenticated"}})

      _ ->
        Lfg.unsubscribe(user.id, String.to_integer(plugin_id))
        json(conn, %{success: %{message: "Unsubscribed from LFG notifications"}})
    end
  end

  def subscription_status(conn, %{"plugin_id" => plugin_id}) do
    user = Pow.Plug.current_user(conn)

    case user do
      nil ->
        json(conn, %{subscribed: false})

      _ ->
        subscribed = Lfg.is_subscribed?(user.id, String.to_integer(plugin_id))
        json(conn, %{subscribed: subscribed})
    end
  end

  defp format_errors(%Ecto.Changeset{} = changeset) do
    Ecto.Changeset.traverse_errors(changeset, fn {msg, opts} ->
      Enum.reduce(opts, msg, fn {key, value}, acc ->
        String.replace(acc, "%{#{key}}", to_string(value))
      end)
    end)
  end

  defp format_errors(_), do: %{}
end
