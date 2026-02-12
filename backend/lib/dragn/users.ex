defmodule DragnCards.Users do
  @moduledoc """
  The Users context.
  """

  import Ecto.Query, warn: false
  alias DragnCards.Repo

  alias DragnCards.Users.User
  require Logger

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

  def delete_user(user_id) do
    import Ecto.Query
    user = get_user!(user_id)

    Repo.transaction(fn ->
      # Delete user plugin permissions
      Repo.delete_all(from r in "user_plugin_permission", where: r.user_id == ^user_id)

      # Delete user's custom content
      Repo.delete_all(from r in "card_alts", where: r.user_id == ^user_id)
      Repo.delete_all(from r in "card_back_alts", where: r.user_id == ^user_id)
      Repo.delete_all(from r in "background_alts", where: r.user_id == ^user_id)
      Repo.delete_all(from r in "custom_card_db", where: r.author_id == ^user_id)

      # Delete user's decks
      Repo.delete_all(from r in "decks", where: r.author_id == ^user_id)

      # Delete user's replays
      Repo.delete_all(from r in "replays", where: r.user_id == ^user_id)

      # Nullify authorship on plugins (keep the plugins alive for other users)
      Repo.update_all(from(r in "plugins", where: r.author_id == ^user_id), set: [author_id: nil])

      # Nullify room log references
      Repo.update_all(from(r in "room_log", where: r.creator_id == ^user_id), set: [creator_id: nil])

      # Delete the user
      Repo.delete!(user)
    end)
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

  def sync_supporter_levels do
    Logger.info("Starting Patreon supporter level sync")

    case DragnCardsWeb.PatreonController.get_member_map() do
      nil ->
        Logger.error("Failed to fetch Patreon member map, skipping sync")

      member_map ->
        users =
          from(u in User, where: not is_nil(u.patreon_member_id))
          |> Repo.all()

        results =
          Enum.reduce(users, %{updated: 0, zeroed: 0, unchanged: 0}, fn user, acc ->
            member = Map.get(member_map, user.patreon_member_id)

            new_level =
              if member do
                amount_cents = get_in(member, ["attributes", "currently_entitled_amount_cents"])
                if amount_cents && amount_cents > 0, do: ceil(amount_cents / 100), else: 0
              else
                0
              end

            if new_level != (user.supporter_level || 0) do
              user
              |> Ecto.Changeset.change(%{supporter_level: new_level})
              |> Repo.update!()

              if new_level == 0, do: Map.update!(acc, :zeroed, &(&1 + 1)), else: Map.update!(acc, :updated, &(&1 + 1))
            else
              Map.update!(acc, :unchanged, &(&1 + 1))
            end
          end)

        Logger.info("Patreon sync complete: #{inspect(results)}")
    end
  end

  def backfill_patreon_member_ids do
    Logger.info("Starting Patreon member ID backfill")

    case DragnCardsWeb.PatreonController.get_member_map() do
      nil ->
        Logger.error("Failed to fetch Patreon member map, skipping backfill")

      member_map ->
        # Build email -> {member_id, level} lookup
        email_lookup =
          Enum.reduce(member_map, %{}, fn {member_id, member}, acc ->
            email = get_in(member, ["attributes", "email"])
            if email do
              amount_cents = get_in(member, ["attributes", "currently_entitled_amount_cents"])
              level = if amount_cents && amount_cents > 0, do: ceil(amount_cents / 100), else: 0
              Map.put(acc, String.downcase(email), {member_id, level})
            else
              acc
            end
          end)

        users =
          from(u in User, where: u.supporter_level > 0 and is_nil(u.patreon_member_id))
          |> Repo.all()

        results =
          Enum.reduce(users, %{matched: 0, unmatched: 0}, fn user, acc ->
            case Map.get(email_lookup, String.downcase(user.email)) do
              {member_id, level} ->
                user
                |> Ecto.Changeset.change(%{patreon_member_id: member_id, supporter_level: level})
                |> Repo.update!()

                Map.update!(acc, :matched, &(&1 + 1))

              nil ->
                Map.update!(acc, :unmatched, &(&1 + 1))
            end
          end)

        Logger.info("Patreon backfill complete: #{inspect(results)}")
    end
  end
end
