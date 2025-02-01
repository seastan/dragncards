defmodule CreateDevUser do
  def run do
    import Ecto.Query
    alias DragnCards.Users.User
    alias DragnCards.Repo

    user_attrs = %{
      alias: "dev_user",
      email: "dev_user@example.com",
      password: "password",
      password_confirmation: "password",
      supporter_level: 1,
      language: "English",
      plugin_settings: %{}
    }

    changeset = User.changeset(%User{}, user_attrs)

    case Repo.insert(changeset) do
      {:ok, user} ->
        IO.puts("User created successfully!")
        IO.inspect(user)

        confirm_time = DateTime.utc_now()

        output =
          from(p in User,
            where: p.id == ^user.id,
            update: [set: [email_confirmed_at: ^confirm_time]]
          )
          |> Repo.update_all([])
          |> case do
            {1, nil} ->
              IO.puts("Email Confirmed for user!")

            _ ->
              IO.puts("Email NOT Confirmed for user!")
          end

      {:error, changeset} ->
        IO.puts("Failed to create user:")
        IO.inspect(changeset.errors)
    end
  end
end

CreateDevUser.run()
