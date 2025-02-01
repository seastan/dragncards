defmodule DragnCardsChat.ChatServer do
  @moduledoc """
  ChatServer is a GenServer for holding a %Chat{}.
  You can start one up with a specified chat_name (string),
  then use add_message/2 to add messages to the chat,
  and messages/1 to get a list of messages in the chat.

  The chat messages cap at out 250 per room.  At 250,
  adding a new message will delete the oldest one.
  Currently not configurable.
  """
  use GenServer
  require Logger
  alias DragnCardsChat.Chat

  @timeout :timer.hours(4)

  def start_link(chat_name) do
    GenServer.start_link(__MODULE__, {chat_name}, name: via_tuple(chat_name))
  end

  @doc """
  via_tuple/1: Given a game name string, generate a via tuple for addressing the game.
  """
  def via_tuple(chat_name),
    do: {:via, Registry, {DragnCardsChat.ChatRegistry, {__MODULE__, chat_name}}}

  @doc """
  chat_pid/1: Returns the `pid` of the chat server process registered
  under the given `chat_name`, or `nil` if no process is registered.
  """
  def chat_pid(chat_name) do
    chat_name
    |> via_tuple()
    |> GenServer.whereis()
  end

  @doc """
  add_message/2: Add a message to the chat room.
  Input: chat_name (String)
  Input: message (Any)
  Output: list of messages ( [ any ] ), newest at last.
  """
  def add_message(chat_name, message) do
    GenServer.call(via_tuple(chat_name), {:add_message, message})
  end

  @doc """
  messages/1: Get a list of chat messages.
  Input: chat_name (String)
  Output: list of messages ( [ any ] ), newest at last.
  """
  def messages(chat_name) do
    GenServer.call(via_tuple(chat_name), :messages)
  end

  #####################################
  ########### IMPLEMENTATION ##########
  #####################################

  def init({chat_name}) do
    Logger.info("ChatServer: Starting a server for chat named [#{chat_name}].")
    chat = %Chat{chat_name: chat_name}
    {:ok, chat, @timeout}
  end

  def handle_call({:add_message, message}, _from, chat) do
    chat = Chat.add_message(chat, message)
    {:reply, Chat.messages(chat), chat, @timeout}
  end

  def handle_call(:messages, _from, chat) do
    {:reply, Chat.messages(chat), chat, @timeout}
  end

  # When timing out, the order is handle_info(:timeout, _) -> terminate({:shutdown, :timeout}, _)
  def handle_info(:timeout, chat) do
    {:stop, {:shutdown, :timeout}, chat}
  end

  def terminate({:shutdown, :timeout}, chat) do
    Logger.info("ChatServer: Terminate (Timeout) running for #{chat.chat_name}")
    #:ets.delete(:chats, chat.chat_name)
    :ok
  end

  def terminate(_reason, chat) do
    Logger.info("chatServer: Strange termination for [#{chat.chat_name}].")
    :ok
  end
end
