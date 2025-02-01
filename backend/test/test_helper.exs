{:ok, _} = Application.ensure_all_started(:dragncards)
ExUnit.start()
Ecto.Adapters.SQL.Sandbox.mode(DragnCards.Repo, :manual)

# Add this line to require the test support files
Path.wildcard("test/support/**/*.exs") |> Enum.each(&Code.require_file/1)
