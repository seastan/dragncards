defmodule DragnCards.Users do
  @moduledoc """
  The Users context.
  """

  import Ecto.Query, warn: false
  alias DragnCards.Repo

  alias DragnCards.Users.User

  @doc """
  Gets a single user by id.
  Raises `Ecto.NoResultsError` if the User does not exist.

  ## Examples

      iex> get_user!(123)
      %user{}

      iex> get_user!(456)
      ** (Ecto.NoResultsError)

  """
  def get_user!(id), do: Repo.get!(User, id)

  @doc """
  Gets a single user by id.
  Returns nil if that user does not exist.
  """
  def get_user(id), do: Repo.get(User, id)

  def get_supporter_level(user_id) do
    user = get_user(user_id)
    if user == nil or user.supporter_level == nil do
      0
    else
      user.supporter_level
    end
  end

  def anon_user_alias() do
    # Generate random number from 1 to 100000
    rand_num = :rand.uniform(100000) |> Integer.to_string
    # Pad with zeros
    rand_num = String.pad_leading(rand_num, 5, "0")
    "u#{rand_num}"
  end

  def get_alias(nil) do
    anon_user_alias()
  end

  def get_alias(user_id) do
    user = get_user(user_id)
    if user == nil do
      anon_user_alias()
    else
      user.alias
    end
  end

  def get_replay_save_permission(user_id) do
    IO.puts("Checking replay save permission for user #{user_id}")
    user = get_user(user_id)
    if user == nil do
      false
    else
      get_supporter_level(user_id) >= 3
    end
  end
end
