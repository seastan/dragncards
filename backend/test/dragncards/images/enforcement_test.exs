defmodule DragnCards.Images.EnforcementTest do
  use DragnCards.DataCase, async: false

  import Swoosh.TestAssertions

  alias DragnCards.Images
  alias DragnCards.Images.{Enforcement, JobLock, Paths, Quota, UserImage, UserImageQuota}
  alias DragnCards.{Repo, Users.User}

  @fixtures Path.expand("../../support/fixtures/images", __DIR__)
  @day 86_400

  setup do
    root = Path.join(System.tmp_dir!(), "enforce_#{System.unique_integer([:positive])}")
    File.mkdir_p!(Path.join(root, "u"))
    previous = Application.get_env(:dragncards, :uploads)
    Application.put_env(:dragncards, :uploads, Keyword.put(previous, :root, root))
    :persistent_term.erase({:dragncards, :last_patreon_sync})

    on_exit(fn ->
      Application.put_env(:dragncards, :uploads, previous)
      :persistent_term.erase({:dragncards, :last_patreon_sync})
      File.rm_rf(root)
    end)

    user =
      %User{}
      |> User.changeset(%{
        email: "patron@example.com",
        password: "testpassword",
        password_confirmation: "testpassword",
        alias: "patron"
      })
      |> Repo.insert!()

    %{user: user, previous: previous}
  end

  defp set_tiers(max_files, max_bytes \\ 100_000_000) do
    config = Application.get_env(:dragncards, :uploads)

    Application.put_env(
      :dragncards,
      :uploads,
      Keyword.put(config, :tiers, [{0, %{max_files: max_files, max_bytes: max_bytes}}])
    )
  end

  defp upload_n(user, n) do
    for i <- 1..n do
      {:ok, image} =
        Images.ingest(user.id, "img#{i}.png", "cards", Path.join(@fixtures, "tiny_ok.png"))

      image
    end
  end

  defp quota(user), do: Repo.get_by!(UserImageQuota, user_id: user.id)

  # Swoosh 0.25's assert_email_sent/1 does not take a function, so read the
  # message the Test adapter sends to this process.
  defp received_email! do
    assert_received {:email, email}
    email
  end

  defp at(days_from_now), do: DateTime.add(DateTime.utc_now(), days_from_now * @day, :second)

  defp backdate_over(user, days_ago) do
    since = at(-days_ago) |> DateTime.truncate(:second)

    Repo.update_all(from(q in UserImageQuota, where: q.user_id == ^user.id),
      set: [over_quota_since: since, last_notified_at: since, notify_count: 1]
    )
  end

  describe "warnings" do
    test "does nothing for a user within their limits", %{user: user} do
      set_tiers(10)
      upload_n(user, 3)

      assert {:ok, %{warned: 0, pruned: 0}} = Enforcement.run()
      assert quota(user).over_quota_since == nil
      assert_no_email_sent()
    end

    test "records when a user first goes over and warns them", %{user: user} do
      set_tiers(10)
      upload_n(user, 5)
      set_tiers(3)

      assert {:ok, %{warned: 1}} = Enforcement.run()
      assert quota(user).over_quota_since != nil

      email = received_email!()
      assert email.subject =~ "over your image hosting limit"
      assert email.text_body =~ "You are using 5 of 3 images"
      assert email.text_body =~ "/myimages"
    end

    test "does not repeat the warning the next day", %{user: user} do
      set_tiers(10)
      upload_n(user, 5)
      set_tiers(3)
      {:ok, _} = Enforcement.run()
      received_email!()

      assert {:ok, %{reminded: 0}} = Enforcement.run(at(1))
      assert_no_email_sent()
    end

    test "sends a reminder once 14 days have passed since the last notice", %{user: user} do
      set_tiers(10)
      upload_n(user, 5)
      set_tiers(3)
      backdate_over(user, 14)

      assert {:ok, %{reminded: 1}} = Enforcement.run()
      email = received_email!()
      assert email.subject =~ "over your image hosting limit"
      assert quota(user).notify_count == 2
    end

    test "sends one final notice inside the last week, and only one", %{user: user} do
      set_tiers(10)
      upload_n(user, 5)
      set_tiers(3)
      # 55 days in: 5 days before the 60-day prune, last notice 10 days ago.
      backdate_over(user, 55)

      Repo.update_all(from(q in UserImageQuota, where: q.user_id == ^user.id),
        set: [last_notified_at: at(-10) |> DateTime.truncate(:second)]
      )

      assert {:ok, %{reminded: 1}} = Enforcement.run()
      email = received_email!()
      assert email.subject =~ "trimmed in a few days"

      assert {:ok, %{reminded: 0}} = Enforcement.run(at(1))
      assert_no_email_sent()
    end

    test "clears the state once the user is back under", %{user: user} do
      set_tiers(10)
      upload_n(user, 5)
      set_tiers(3)
      backdate_over(user, 20)
      set_tiers(10)

      assert {:ok, %{cleared: 1}} = Enforcement.run()
      assert quota(user).over_quota_since == nil
      assert_no_email_sent()
    end
  end

  describe "pruning" do
    test "after the grace period, removes the newest images until back under", %{user: user} do
      set_tiers(10)
      images = upload_n(user, 5)
      set_tiers(3)
      backdate_over(user, 60)
      Enforcement.record_patreon_sync()

      assert {:ok, %{pruned: 1}} = Enforcement.run()

      [oldest1, oldest2, oldest3, newest4, newest5] = images

      remaining =
        Repo.all(from(i in UserImage, where: i.user_id == ^user.id, select: i.id)) |> Enum.sort()

      assert remaining == Enum.sort([oldest1.id, oldest2.id, oldest3.id])

      refute File.exists?(Paths.abs_path!(user.id, newest4.path))
      refute File.exists?(Paths.abs_path!(user.id, newest5.path))
      assert File.exists?(Paths.abs_path!(user.id, oldest1.path))

      q = quota(user)
      assert q.image_count == 3
      assert q.over_quota_since == nil
      assert q.last_pruned_at != nil

      email = received_email!()
      assert email.subject =~ "were removed"
      assert email.text_body =~ "img5.webp"
      assert email.text_body =~ "img4.webp"
      refute email.text_body =~ "img1.webp"
    end

    test "trims to the byte limit as well as the count", %{user: user} do
      set_tiers(10)
      [first | _] = upload_n(user, 4)
      # Count is fine; bytes allow only one image.
      set_tiers(10, first.bytes)
      backdate_over(user, 61)
      Enforcement.record_patreon_sync()

      assert {:ok, %{pruned: 1}} = Enforcement.run()
      assert Quota.get_or_build(user.id).image_count == 1
      assert Repo.get(UserImage, first.id)
    end

    test "never prunes when the Patreon sync has not run on this instance", %{user: user} do
      set_tiers(10)
      upload_n(user, 5)
      set_tiers(3)
      backdate_over(user, 90)

      assert {:ok, %{deferred: 1, pruned: 0}} = Enforcement.run()
      assert quota(user).image_count == 5
      assert_no_email_sent()
    end

    test "never prunes when the last Patreon sync is stale", %{user: user} do
      set_tiers(10)
      upload_n(user, 5)
      set_tiers(3)
      backdate_over(user, 90)
      Enforcement.record_patreon_sync(at(-3))

      assert {:ok, %{deferred: 1}} = Enforcement.run()
      assert quota(user).image_count == 5
    end

    test "does not prune before the grace period ends", %{user: user} do
      set_tiers(10)
      upload_n(user, 5)
      set_tiers(3)
      backdate_over(user, 59)
      Enforcement.record_patreon_sync()

      assert {:ok, %{pruned: 0}} = Enforcement.run()
      assert quota(user).image_count == 5
    end
  end

  test "does nothing when image hosting is not configured on this host", %{user: user} do
    set_tiers(10)
    upload_n(user, 5)
    set_tiers(3)
    config = Application.get_env(:dragncards, :uploads)
    Application.put_env(:dragncards, :uploads, Keyword.put(config, :enabled, false))

    assert :disabled = Enforcement.run()
    assert quota(user).over_quota_since == nil
  end

  describe "JobLock" do
    test "a second instance is refused while the first holds the lock" do
      # Needs real, separate connections: in the shared sandbox both callers
      # would use one session, and advisory locks are re-entrant per session.
      :ok = Ecto.Adapters.SQL.Sandbox.checkin(Repo)
      :ok = Ecto.Adapters.SQL.Sandbox.mode(Repo, :auto)
      on_exit(fn -> Ecto.Adapters.SQL.Sandbox.mode(Repo, :manual) end)

      parent = self()

      holder =
        Task.async(fn ->
          JobLock.with_lock(:test_job, fn ->
            send(parent, :holding)
            receive do: (:release -> :done)
          end)
        end)

      assert_receive :holding, 5_000
      assert :locked = JobLock.with_lock(:test_job, fn -> :ran end)

      send(holder.pid, :release)
      assert {:ok, :done} = Task.await(holder)

      # Released properly: the next caller gets it.
      assert {:ok, :ran} = JobLock.with_lock(:test_job, fn -> :ran end)
    end
  end
end
