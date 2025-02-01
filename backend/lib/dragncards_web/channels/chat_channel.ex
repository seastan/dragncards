defmodule DragnCardsWeb.ChatChannel do
  @moduledoc """
  Channel for chatrooms
  """
  use DragnCardsWeb, :channel
  alias DragnCardsChat.{ChatMessage, ChatServer, ChatSupervisor}

  def join("chat:" <> room_slug, _payload, socket) do
    {:ok, _pid} = ChatSupervisor.start_chat_if_needed(room_slug)
    messages = ChatServer.messages(room_slug)

    socket =
      socket
      |> assign(:room_slug, room_slug)
      |> assign(:messages, messages)

    {:ok, client_state(socket), socket}
  end

  # New chat message typed from user
  def handle_in(
        "message",
        %{"message" => message_text},
        %{assigns: %{room_slug: _room_slug, user_id: user_id}} = socket
      ) do
    message = ChatMessage.new(message_text, user_id)

    #messages = ChatServer.add_message(room_slug, message)

    socket =
      socket
      |> assign(:new_message, message)

    notify(socket)
    # use noreply - Notify will send them a reply
    {:noreply, socket}
  end

  # New chat message typed from user
  def handle_in(
      "game_update",
      %{"message" => message_text},
      %{assigns: %{room_slug: room_slug, user_id: user_id}} = socket
    ) do

    message = ChatMessage.new(message_text, -1)

    messages = ChatServer.add_message(room_slug, message)

    socket =
      socket
      |> assign(:messages, messages)

    notify(socket)
    # use noreply - Notify will send them a reply
    {:noreply, socket}
  end

  # Channels can be used in a request/response fashion
  # by sending replies to requests from the client
  def handle_in("ping", payload, socket) do
    {:reply, {:ok, payload}, socket}
  end

  # It is also common to receive messages from the client and
  # broadcast to everyone in the current topic (chat:lobby).
  def handle_in("shout", payload, socket) do
    broadcast(socket, "shout", payload)
    {:noreply, socket}
  end

  defp notify(socket) do
    # # Fake a phx_reply event to everyone
    payload = %{
      response: client_state(socket),
      status: "ok"
    }

    broadcast!(socket, "phx_reply", payload)
  end

  # This is what part of the state gets sent to the client.
  # It can be used to transform or hide it before they get it.
  defp client_state(socket) do
    socket.assigns
  end
end
