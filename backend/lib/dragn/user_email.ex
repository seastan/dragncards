defmodule DragnCards.UserEmail do
  @moduledoc """
  Emails are defined in here.
  """
  import Swoosh.Email

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
    <p><a href="https://dragncards.com">Visit DragnCards to join</a></p>
    """)
    |> text_body("""
    New LFG Post for #{plugin_name}

    #{poster_alias} is looking for players!
    #{post.description || "No description provided."}
    Players wanted: #{post.num_players_wanted}
    Experience level: #{post.experience_level}

    Visit https://dragncards.com to join
    """)
  end

  def lfg_game_confirmed(user, plugin_name, confirmed_start_time, _post) do
    time_str =
      if confirmed_start_time do
        Calendar.strftime(confirmed_start_time, "%Y-%m-%d %H:%M UTC")
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
