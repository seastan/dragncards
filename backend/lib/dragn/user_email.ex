defmodule DragnCards.UserEmail do
  @moduledoc """
  Emails are defined in here.
  """
  import Swoosh.Email

  defp format_datetime(utc_datetime, user) do
    tz = user.timezone

    if tz && tz != "" do
      case DateTime.shift_zone(utc_datetime, tz) do
        {:ok, local_dt} ->
          Calendar.strftime(local_dt, "%a, %b %d, %Y %I:%M %p") <> " #{tz_abbreviation(local_dt, tz)}"

        _ ->
          Calendar.strftime(utc_datetime, "%a, %b %d, %Y %I:%M %p UTC")
      end
    else
      Calendar.strftime(utc_datetime, "%a, %b %d, %Y %I:%M %p UTC")
    end
  end

  defp tz_abbreviation(dt, tz) do
    case Calendar.strftime(dt, "%Z") do
      "+" <> _ -> tz
      "-" <> _ -> tz
      abbr when abbr != "" -> abbr
      _ -> tz
    end
  end

  # --- Plugin image hosting ---------------------------------------------------

  @doc """
  Warns a user who is over their image hosting limit. `kind` is :first,
  :reminder or :final (sent within the last week before images are removed).
  """
  def image_quota_warning(user, quota, limits, prune_at, kind) do
    when_text = format_datetime(prune_at, user)
    manage_url = images_url()

    subject =
      case kind do
        :final -> "[DragnCards] Your hosted images will be trimmed in a few days"
        _ -> "[DragnCards] You are over your image hosting limit"
      end

    usage =
      "You are using #{number(quota.image_count)} of #{number(limits.max_files)} images " <>
        "and #{megabytes(quota.total_bytes)} of #{megabytes(limits.max_bytes)}."

    new()
    |> to({user.alias || "Player", user.email})
    |> from({"DragnCards", "noreply@noreply.dragncards.com"})
    |> subject(subject)
    |> html_body("""
    <h2>You are over your image hosting limit</h2>
    <p>#{usage}</p>
    <p>Your images are still being served, but new uploads are paused.</p>
    <p>On <strong>#{when_text}</strong>, the most recently uploaded images will be removed until
    you are back under your limit. Anything using those image URLs will stop showing them.</p>
    <p>To keep them, delete some images or increase your support level before then.</p>
    <p><a href="#{manage_url}">Manage your images</a></p>
    """)
    |> text_body("""
    You are over your image hosting limit

    #{usage}

    Your images are still being served, but new uploads are paused.

    On #{when_text}, the most recently uploaded images will be removed until you are
    back under your limit. Anything using those image URLs will stop showing them.

    To keep them, delete some images or increase your support level before then.

    Manage your images: #{manage_url}
    """)
  end

  @doc """
  Tells a user which images were removed. Includes a sample of the paths,
  because the newest images are exactly the ones most recently wired into a
  plugin, and the author needs to know which URLs just stopped working.
  """
  def image_quota_pruned(user, count, bytes, sample_paths) do
    manage_url = images_url()
    more = if count > length(sample_paths), do: count - length(sample_paths), else: 0

    list_html = Enum.map_join(sample_paths, "", &"<li>#{html_escape(&1)}</li>")
    list_text = Enum.map_join(sample_paths, "\n", &"  - #{&1}")
    more_line = if more > 0, do: "...and #{number(more)} more.", else: ""

    new()
    |> to({user.alias || "Player", user.email})
    |> from({"DragnCards", "noreply@noreply.dragncards.com"})
    |> subject("[DragnCards] Some of your hosted images were removed")
    |> html_body("""
    <h2>Some of your hosted images were removed</h2>
    <p>Your account was over its image hosting limit for the full grace period, so the
    #{number(count)} most recently uploaded images (#{megabytes(bytes)}) were removed.
    Anything using their URLs will no longer show them.</p>
    <ul>#{list_html}</ul>
    <p>#{more_line}</p>
    <p><a href="#{manage_url}">Manage your images</a></p>
    """)
    |> text_body("""
    Some of your hosted images were removed

    Your account was over its image hosting limit for the full grace period, so the
    #{number(count)} most recently uploaded images (#{megabytes(bytes)}) were removed.
    Anything using their URLs will no longer show them.

    #{list_text}
    #{more_line}

    Manage your images: #{manage_url}
    """)
  end

  # The public site for this host, derived from the uploads base URL so beta
  # emails link to beta and production emails link to production.
  defp images_url do
    base =
      :dragncards
      |> Application.get_env(:uploads, [])
      |> Keyword.get(:public_base_url, "https://dragncards.com/uploads")

    String.replace_suffix(base, "/uploads", "") <> "/myimages"
  end

  defp number(n), do: n |> Integer.to_string() |> String.replace(~r/\B(?=(\d{3})+(?!\d))/, ",")

  defp megabytes(bytes), do: "#{Float.round(bytes / 1_048_576, 1)} MB"

  defp html_escape(text),
    do: text |> Phoenix.HTML.html_escape() |> Phoenix.HTML.safe_to_string()

  def welcome(user) do
    new()
    |> to({user.name, user.email})
    |> from({"DragnCards", "noreply@noreply.dragncards.com"})
    |> subject("Welcome!")
    |> html_body("<h1>Hello #{user.name}</h1>")
    |> text_body("Hello #{user.name}\n")
  end

  def another_test_email(user) do
    new()
    |> to({user.name, user.email})
    |> from({"DragnCards", "noreply@noreply.dragncards.com"})
    |> subject("A third email test.")
    |> html_body(
      "This is a third email test.  I don't want to send the same email over and over while testing my development out..."
    )
    |> text_body(
      "This is a third email test.  I don't want to send the same email over and over while testing my development out..."
    )
  end

  def lfg_new_post(user, poster_alias, plugin_name, post) do
    time_window =
      if post.available_from && post.available_to do
        from_str = format_datetime(post.available_from, user)
        to_str = format_datetime(post.available_to, user)
        "#{from_str} – #{to_str}"
      else
        "Not specified"
      end

    plugin_url = "https://dragncards.com/plugin/#{post.plugin_id}"

    new()
    |> to({user.alias || "Player", user.email})
    |> from({"DragnCards", "noreply@noreply.dragncards.com"})
    |> subject("[DragnCards] Someone is looking for a #{plugin_name} game!")
    |> html_body("""
    <h2>New LFG Post for #{plugin_name}</h2>
    <p><strong>#{poster_alias}</strong> is looking for players!</p>
    <p>#{post.description || "No description provided."}</p>
    <p><strong>Players wanted:</strong> #{post.num_players_wanted}</p>
    <p><strong>Experience level:</strong> #{post.experience_level}</p>
    <p><strong>Available window:</strong> #{time_window}</p>
    <p><a href="#{plugin_url}">Visit DragnCards to join</a></p>
    """)
    |> text_body("""
    New LFG Post for #{plugin_name}

    #{poster_alias} is looking for players!
    #{post.description || "No description provided."}
    Players wanted: #{post.num_players_wanted}
    Experience level: #{post.experience_level}
    Available window: #{time_window}

    Visit #{plugin_url} to join
    """)
  end

  def lfg_game_confirmed(user, plugin_name, confirmed_start_time, _post) do
    time_str =
      if confirmed_start_time do
        format_datetime(confirmed_start_time, user)
      else
        "TBD (a player left, game is no longer confirmed)"
      end

    new()
    |> to({user.alias || "Player", user.email})
    |> from({"DragnCards", "noreply@noreply.dragncards.com"})
    |> subject("[DragnCards] Your #{plugin_name} game is confirmed!")
    |> html_body("""
    <h2>Game Confirmed!</h2>
    <p>Your <strong>#{plugin_name}</strong> game has enough players.</p>
    <p><strong>Start time:</strong> #{time_str}</p>
    <p>A game room will be created automatically 5 minutes before the start time. You'll receive another email with the room link.</p>
    """)
    |> text_body("""
    Game Confirmed!

    Your #{plugin_name} game has enough players.
    Start time: #{time_str}

    A game room will be created automatically 5 minutes before the start time.
    You'll receive another email with the room link.
    """)
  end

  def lfg_room_ready(user, plugin_name, room_slug) do
    room_url = "https://dragncards.com/room/#{room_slug}"

    new()
    |> to({user.alias || "Player", user.email})
    |> from({"DragnCards", "noreply@noreply.dragncards.com"})
    |> subject("[DragnCards] Your #{plugin_name} game room is ready!")
    |> html_body("""
    <h2>Your Game Room is Ready!</h2>
    <p>Your <strong>#{plugin_name}</strong> game room has been created.</p>
    <p><a href="#{room_url}">Click here to join the game</a></p>
    """)
    |> text_body("""
    Your Game Room is Ready!

    Your #{plugin_name} game room has been created.
    Join here: #{room_url}
    """)
  end
end
