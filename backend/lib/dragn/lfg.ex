defmodule DragnCards.Lfg do
  @moduledoc """
  The LFG (Looking for Game) context.
  """

  import Ecto.Query, warn: false
  require Logger

  alias DragnCards.Repo
  alias DragnCards.Lfg.{LfgPost, LfgResponse, LfgSubscription}
  alias DragnCards.{Users, Mailer, UserEmail}
  alias DragnCardsWeb.Endpoint
  alias DragnCardsUtil.NameGenerator
  alias DragnCardsGame.GameUISupervisor
  alias DragnCards.Rooms

  @doc """
  List active LFG posts for a plugin.
  Returns posts where status is "open" or "filled" and available_to > now.
  """
  def list_active_posts(plugin_id) do
    now = DateTime.utc_now()

    posts =
      from(p in LfgPost,
        where: p.plugin_id == ^plugin_id,
        where: p.status in ["open", "filled"],
        where: p.available_to > ^now,
        order_by: [asc: p.available_from]
      )
      |> Repo.all()

    # Preload responses and user aliases
    post_ids = Enum.map(posts, & &1.id)

    responses =
      from(r in LfgResponse,
        where: r.lfg_post_id in ^post_ids
      )
      |> Repo.all()

    # Get all user IDs we need aliases for
    user_ids =
      (Enum.map(posts, & &1.user_id) ++ Enum.map(responses, & &1.user_id))
      |> Enum.uniq()

    alias_map =
      Enum.reduce(user_ids, %{}, fn uid, acc ->
        Map.put(acc, uid, Users.get_alias(uid))
      end)

    # Group responses by post_id
    responses_by_post =
      Enum.group_by(responses, & &1.lfg_post_id)

    # Return plain maps (guaranteed JSON-safe, no struct encoding issues)
    Enum.map(posts, fn post ->
      post_responses =
        Map.get(responses_by_post, post.id, [])
        |> Enum.map(fn r ->
          %{
            id: r.id,
            lfg_post_id: r.lfg_post_id,
            user_id: r.user_id,
            earliest_start: r.earliest_start,
            user_alias: Map.get(alias_map, r.user_id, "Unknown")
          }
        end)

      %{
        id: post.id,
        user_id: post.user_id,
        plugin_id: post.plugin_id,
        description: post.description,
        num_players_wanted: post.num_players_wanted,
        experience_level: post.experience_level,
        available_from: post.available_from,
        available_to: post.available_to,
        status: post.status,
        confirmed_start_time: post.confirmed_start_time,
        room_slug: post.room_slug,
        inserted_at: post.inserted_at,
        user_alias: Map.get(alias_map, post.user_id, "Unknown"),
        responses: post_responses
      }
    end)
  end

  @doc """
  Create a new LFG post.
  """
  def create_post(user, attrs) do
    changeset =
      %LfgPost{}
      |> LfgPost.changeset(Map.put(attrs, "user_id", user.id))

    case Repo.insert(changeset) do
      {:ok, post} ->
        try do
          notify_lfg_channel(post.plugin_id)
        rescue
          e -> Logger.error("Failed to broadcast LFG channel update: #{inspect(e)}")
        end

        try do
          notify_subscribers(post, user)
        rescue
          e -> Logger.error("Failed to notify LFG subscribers: #{inspect(e)}")
        end

        {:ok, post}

      {:error, changeset} ->
        {:error, changeset}
    end
  end

  @doc """
  Delete an LFG post. Only the owner or an admin can delete.
  """
  def delete_post(post_id, user) do
    post = Repo.get(LfgPost, post_id)

    cond do
      post == nil ->
        {:error, :not_found}

      post.user_id == user.id || user.admin ->
        plugin_id = post.plugin_id
        Repo.delete(post)
        notify_lfg_channel(plugin_id)
        {:ok, :deleted}

      true ->
        {:error, :unauthorized}
    end
  end

  @doc """
  Respond to an LFG post (join the game).
  If enough players have joined, mark the post as filled.
  """
  def respond_to_post(post_id, user, earliest_start) do
    post = Repo.get(LfgPost, post_id)

    cond do
      post == nil ->
        {:error, :not_found}

      post.status != "open" ->
        {:error, :not_open}

      post.user_id == user.id ->
        {:error, :own_post}

      true ->
        changeset =
          %LfgResponse{}
          |> LfgResponse.changeset(%{
            "lfg_post_id" => post_id,
            "user_id" => user.id,
            "earliest_start" => earliest_start
          })

        case Repo.insert(changeset) do
          {:ok, _response} ->
            check_if_filled(post)
            notify_lfg_channel(post.plugin_id)
            {:ok, :joined}

          {:error, changeset} ->
            {:error, changeset}
        end
    end
  end

  @doc """
  Cancel a response to an LFG post (leave the game).
  If the post was filled, revert to open.
  """
  def cancel_response(post_id, user) do
    response =
      from(r in LfgResponse,
        where: r.lfg_post_id == ^post_id,
        where: r.user_id == ^user.id
      )
      |> Repo.one()

    case response do
      nil ->
        {:error, :not_found}

      response ->
        post = Repo.get(LfgPost, post_id)
        Repo.delete(response)

        if post.status == "filled" do
          post
          |> Ecto.Changeset.change(%{status: "open", confirmed_start_time: nil})
          |> Repo.update()

          # Email all parties that the game is un-confirmed
          notify_game_unconfirmed(post)
        end

        notify_lfg_channel(post.plugin_id)
        {:ok, :left}
    end
  end

  @doc """
  Called by Periodic every minute.
  Creates rooms for posts that are filled and within 5 minutes of start time.
  """
  def create_rooms_for_filled_posts do
    five_minutes_from_now = DateTime.add(DateTime.utc_now(), 5 * 60, :second)

    posts =
      from(p in LfgPost,
        where: p.status == "filled",
        where: p.confirmed_start_time <= ^five_minutes_from_now,
        where: is_nil(p.room_slug)
      )
      |> Repo.all()

    Enum.each(posts, fn post ->
      try do
        create_room_for_post(post)
      rescue
        e ->
          Logger.error("Failed to create room for LFG post #{post.id}: #{inspect(e)}")
      end
    end)
  end

  @doc """
  Called by Periodic to clean up expired posts.
  """
  def cleanup_expired_posts do
    now = DateTime.utc_now()

    from(p in LfgPost,
      where: p.status == "open",
      where: p.available_to < ^now
    )
    |> Repo.update_all(set: [status: "expired"])
  end

  @doc """
  Subscribe a user to LFG notifications for a plugin.
  """
  def subscribe(user_id, plugin_id) do
    changeset =
      %LfgSubscription{}
      |> LfgSubscription.changeset(%{"user_id" => user_id, "plugin_id" => plugin_id})

    IO.inspect(changeset, label: "LFG subscribe changeset")

    try do
      result = Repo.insert(changeset)
      IO.inspect(result, label: "LFG subscribe result")
      result
    rescue
      e ->
        Logger.error("LFG subscribe error: #{inspect(e)}")
        {:error, :db_error}
    end
  end

  @doc """
  Unsubscribe a user from LFG notifications for a plugin.
  """
  def unsubscribe(user_id, plugin_id) do
    from(s in LfgSubscription,
      where: s.user_id == ^user_id,
      where: s.plugin_id == ^plugin_id
    )
    |> Repo.delete_all()

    :ok
  end

  @doc """
  Check if a user is subscribed to LFG notifications for a plugin.
  """
  def is_subscribed?(user_id, plugin_id) do
    from(s in LfgSubscription,
      where: s.user_id == ^user_id,
      where: s.plugin_id == ^plugin_id
    )
    |> Repo.exists?()
  end

  # --- Private functions ---

  defp check_if_filled(post) do
    response_count =
      from(r in LfgResponse, where: r.lfg_post_id == ^post.id)
      |> Repo.aggregate(:count)

    if response_count >= post.num_players_wanted do
      # Compute confirmed_start_time as the latest earliest_start among respondents
      max_earliest_start =
        from(r in LfgResponse,
          where: r.lfg_post_id == ^post.id,
          select: max(r.earliest_start)
        )
        |> Repo.one()

      post
      |> Ecto.Changeset.change(%{status: "filled", confirmed_start_time: max_earliest_start})
      |> Repo.update()

      # Email all parties with confirmed time
      notify_game_confirmed(post, max_earliest_start)
    end
  end

  defp create_room_for_post(post) do
    game_name = NameGenerator.generate()
    user = Users.get_user(post.user_id)

    plugin = Repo.get(DragnCards.Plugins.Plugin, post.plugin_id)

    options = %{
      "privacyType" => "private",
      "replayUuid" => nil,
      "externalData" => nil,
      "ringsDbInfo" => nil,
      "pluginId" => post.plugin_id,
      "pluginVersion" => nil,
      "pluginName" => plugin && plugin.name
    }

    GameUISupervisor.start_game(game_name, user, options)
    room = Rooms.get_room_by_name(game_name)

    if room do
      post
      |> Ecto.Changeset.change(%{status: "started", room_slug: room.slug})
      |> Repo.update()

      # Email all parties with room link
      notify_room_ready(post, room.slug, plugin)
      notify_lfg_channel(post.plugin_id)
    else
      Logger.error("Failed to create room for LFG post #{post.id}")
    end
  end

  defp notify_lfg_channel(plugin_id) do
    posts = list_active_posts(plugin_id)
    Endpoint.broadcast!("lfg:#{plugin_id}", "lfg_update", %{posts: posts})
  end

  defp notify_subscribers(post, poster_user) do
    plugin = Repo.get(DragnCards.Plugins.Plugin, post.plugin_id)
    plugin_name = if plugin, do: plugin.name, else: "Unknown"
    poster_alias = Users.get_alias(poster_user.id)

    subscriptions =
      from(s in LfgSubscription,
        where: s.plugin_id == ^post.plugin_id,
        where: s.user_id != ^post.user_id
      )
      |> Repo.all()

    Enum.each(subscriptions, fn sub ->
      user = Users.get_user(sub.user_id)

      if user && user.email do
        try do
          UserEmail.lfg_new_post(user, poster_alias, plugin_name, post)
          |> Mailer.deliver()
        rescue
          e -> Logger.error("Failed to send LFG notification email: #{inspect(e)}")
        end
      end
    end)
  end

  defp notify_game_confirmed(post, confirmed_start_time) do
    plugin = Repo.get(DragnCards.Plugins.Plugin, post.plugin_id)
    plugin_name = if plugin, do: plugin.name, else: "Unknown"

    all_user_ids = get_all_party_user_ids(post)

    Enum.each(all_user_ids, fn uid ->
      user = Users.get_user(uid)

      if user && user.email do
        try do
          UserEmail.lfg_game_confirmed(user, plugin_name, confirmed_start_time, post)
          |> Mailer.deliver()
        rescue
          e -> Logger.error("Failed to send game confirmed email: #{inspect(e)}")
        end
      end
    end)
  end

  defp notify_game_unconfirmed(post) do
    all_user_ids = get_all_party_user_ids(post)

    Enum.each(all_user_ids, fn uid ->
      user = Users.get_user(uid)

      if user && user.email do
        try do
          plugin = Repo.get(DragnCards.Plugins.Plugin, post.plugin_id)
          plugin_name = if plugin, do: plugin.name, else: "Unknown"

          UserEmail.lfg_game_confirmed(user, plugin_name, nil, post)
          |> Mailer.deliver()
        rescue
          e -> Logger.error("Failed to send game unconfirmed email: #{inspect(e)}")
        end
      end
    end)
  end

  defp notify_room_ready(post, room_slug, plugin) do
    plugin_name = if plugin, do: plugin.name, else: "Unknown"
    all_user_ids = get_all_party_user_ids(post)

    Enum.each(all_user_ids, fn uid ->
      user = Users.get_user(uid)

      if user && user.email do
        try do
          UserEmail.lfg_room_ready(user, plugin_name, room_slug)
          |> Mailer.deliver()
        rescue
          e -> Logger.error("Failed to send room ready email: #{inspect(e)}")
        end
      end
    end)
  end

  defp get_all_party_user_ids(post) do
    response_user_ids =
      from(r in LfgResponse,
        where: r.lfg_post_id == ^post.id,
        select: r.user_id
      )
      |> Repo.all()

    [post.user_id | response_user_ids] |> Enum.uniq()
  end
end
