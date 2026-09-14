defmodule DragnCards.Images.Enforcement do
  @moduledoc """
  Daily handling of users who are over their image hosting limits, usually
  because their Patreon support lapsed or dropped a tier.

  Being over quota never affects serving: nginx serves files without consulting
  the database, and uploads are already refused by Quota.commit/2. This job only
  warns and, after a grace period, trims:

    * first found over    -> record over_quota_since, send a warning email
    * still over          -> reminder every 14 days, plus a final one a week out
    * over for grace days -> delete newest images first until back under, email
                             what was removed
    * back under          -> clear the state (they deleted images or upgraded)

  Pruning is refused unless the Patreon supporter sync has succeeded recently.
  sync_supporter_levels/0 silently skips when Patreon is unreachable; pruning on
  stale levels could delete a paying supporter's artwork.
  """

  import Ecto.Query

  alias DragnCards.Images.{JobLock, Paths, Quota, UserImage, UserImageQuota}
  alias DragnCards.{Mailer, Repo, UserEmail, Users}

  require Logger

  @reminder_every_days 14
  @final_notice_days 7
  @sync_max_age_hours 48
  @sample_size 20

  @doc "Entry point for the scheduled job."
  @spec run() :: {:ok, map()} | :locked | :disabled
  def run(now \\ DateTime.utc_now()) do
    if Paths.enabled?() do
      case JobLock.with_lock(:image_quota_enforcement, fn -> run_unlocked(now) end) do
        :locked ->
          Logger.info("image enforcement: another instance holds the lock, skipping")
          :locked

        {:ok, summary} ->
          Logger.info("image enforcement complete: #{inspect(summary)}")
          {:ok, summary}
      end
    else
      :disabled
    end
  end

  @doc false
  def run_unlocked(now) do
    now = DateTime.truncate(now, :second)

    from(q in UserImageQuota, where: q.image_count > 0 or not is_nil(q.over_quota_since))
    |> Repo.all()
    |> Enum.reduce(%{warned: 0, reminded: 0, pruned: 0, cleared: 0, deferred: 0}, fn quota, acc ->
      case evaluate(quota, now) do
        :ok -> acc
        outcome -> Map.update!(acc, outcome, &(&1 + 1))
      end
    end)
  end

  @doc "When the most recent successful Patreon sync finished, if known."
  def record_patreon_sync(at \\ DateTime.utc_now()),
    do: :persistent_term.put({:dragncards, :last_patreon_sync}, at)

  def last_patreon_sync, do: :persistent_term.get({:dragncards, :last_patreon_sync}, nil)

  @doc """
  Pruning only happens on fresh supporter levels. An unknown sync time (a fresh
  restart before the first sync) counts as stale: at worst that defers a prune
  that was already 60 days coming by one more day.
  """
  def prune_allowed?(now \\ DateTime.utc_now()) do
    case last_patreon_sync() do
      nil -> false
      at -> DateTime.diff(now, at, :hour) < @sync_max_age_hours
    end
  end

  defp evaluate(quota, now) do
    limits = Quota.limits_for_user(quota.user_id)
    over? = Quota.over_quota?(quota, limits)
    grace_days = grace_days()

    cond do
      not over? and quota.over_quota_since != nil ->
        clear!(quota)
        :cleared

      not over? ->
        :ok

      quota.over_quota_since == nil ->
        quota = mark_over!(quota, now)
        notify(quota, limits, :first, prune_at(quota))
        :warned

      DateTime.diff(now, quota.over_quota_since, :day) >= grace_days ->
        if prune_allowed?(now) do
          prune!(quota, limits, now)
          :pruned
        else
          Logger.error("image prune for user #{quota.user_id} deferred: Patreon supporter levels are stale")
          :deferred
        end

      true ->
        maybe_remind(quota, limits, now)
    end
  end

  defp maybe_remind(quota, limits, now) do
    prune_at = prune_at(quota)
    days_left = DateTime.diff(prune_at, now, :day)
    final_threshold = DateTime.add(prune_at, -@final_notice_days * 86_400, :second)
    since_last = quota.last_notified_at && DateTime.diff(now, quota.last_notified_at, :day)

    cond do
      # One final notice once inside the last week, if not already sent then.
      days_left <= @final_notice_days and
          (quota.last_notified_at == nil or DateTime.compare(quota.last_notified_at, final_threshold) == :lt) ->
        notify(quota, limits, :final, prune_at)
        touch_notified!(quota, now)
        :reminded

      days_left > @final_notice_days and (since_last == nil or since_last >= @reminder_every_days) ->
        notify(quota, limits, :reminder, prune_at)
        touch_notified!(quota, now)
        :reminded

      true ->
        :ok
    end
  end

  # Newest first, until both the count and the bytes fit.
  defp prune!(quota, limits, now) do
    images =
      from(i in UserImage,
        where: i.user_id == ^quota.user_id,
        order_by: [desc: i.inserted_at, desc: i.id],
        select: %{id: i.id, bytes: i.bytes, path: i.path}
      )
      |> Repo.all()

    {doomed, _count, _bytes} =
      Enum.reduce_while(images, {[], quota.image_count, quota.total_bytes}, fn image, {acc, count, bytes} ->
        if count <= limits.max_files and bytes <= limits.max_bytes do
          {:halt, {acc, count, bytes}}
        else
          {:cont, {[image | acc], count - 1, bytes - image.bytes}}
        end
      end)

    doomed = Enum.reverse(doomed)
    {:ok, %{deleted: deleted, bytes: freed}} = Quota.delete(quota.user_id, Enum.map(doomed, & &1.id))

    quota
    |> Ecto.Changeset.change(over_quota_since: nil, last_notified_at: nil, notify_count: 0, last_pruned_at: now)
    |> Repo.update!()

    with %{} = user <- Users.get_user(quota.user_id) do
      sample = doomed |> Enum.take(@sample_size) |> Enum.map(& &1.path)
      user |> UserEmail.image_quota_pruned(deleted, freed, sample) |> deliver()
    end

    Logger.warning("image prune: user #{quota.user_id} lost #{deleted} images (#{freed} bytes)")
  end

  defp mark_over!(quota, now) do
    quota
    |> Ecto.Changeset.change(over_quota_since: now, last_notified_at: now, notify_count: 1)
    |> Repo.update!()
  end

  defp clear!(quota) do
    quota
    |> Ecto.Changeset.change(over_quota_since: nil, last_notified_at: nil, notify_count: 0)
    |> Repo.update!()
  end

  defp touch_notified!(quota, now) do
    quota
    |> Ecto.Changeset.change(last_notified_at: now, notify_count: quota.notify_count + 1)
    |> Repo.update!()
  end

  defp notify(quota, limits, kind, prune_at) do
    with %{} = user <- Users.get_user(quota.user_id) do
      user
      |> UserEmail.image_quota_warning(quota, limits, prune_at, kind)
      |> deliver()
    end
  end

  # A failed email must not abort the run for every user after this one.
  defp deliver(email) do
    case Mailer.deliver(email) do
      {:ok, _} -> :ok
      {:error, reason} -> Logger.error("image quota email failed: #{inspect(reason)}")
    end
  rescue
    error -> Logger.error("image quota email raised: #{inspect(error)}")
  end

  defp prune_at(quota), do: DateTime.add(quota.over_quota_since, grace_days() * 86_400, :second)

  defp grace_days,
    do: :dragncards |> Application.get_env(:uploads, []) |> Keyword.get(:prune_grace_days, 60)
end
