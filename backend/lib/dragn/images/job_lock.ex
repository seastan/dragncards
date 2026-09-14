defmodule DragnCards.Images.JobLock do
  @moduledoc """
  Runs a scheduled job on at most one app instance at a time.

  Blue-green deploys deliberately keep two instances (ports 4000 and 4001)
  running side by side until old rooms drain, so every Periodic job runs twice
  on deploy days. That is harmless for the Patreon sync, but not for jobs that
  delete or move user files.

  Uses a session-level Postgres advisory lock on a single checked-out
  connection, rather than a transaction-level one: the jobs run many short
  transactions of their own (and delete files after each commits), which must
  not all be folded into one long outer transaction.
  """

  alias DragnCards.Repo

  @doc "Runs `fun` if the lock for `name` is free; returns {:ok, result} or :locked."
  @spec with_lock(atom(), (-> any())) :: {:ok, any()} | :locked
  def with_lock(name, fun) when is_atom(name) and is_function(fun, 0) do
    key = key(name)

    Repo.checkout(fn ->
      case Repo.query!("SELECT pg_try_advisory_lock($1)", [key]) do
        %{rows: [[true]]} ->
          try do
            {:ok, fun.()}
          after
            Repo.query!("SELECT pg_advisory_unlock($1)", [key])
          end

        _ ->
          :locked
      end
    end)
  end

  @doc false
  def key(name), do: :erlang.phash2({:dragncards_job, name})
end
