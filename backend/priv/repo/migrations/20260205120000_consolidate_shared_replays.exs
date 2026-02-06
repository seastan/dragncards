defmodule DragnCards.Repo.Migrations.ConsolidateSharedReplays do
  use Ecto.Migration

  def up do
    # Add player_ids column
    alter table(:replays) do
      add :player_ids, {:array, :integer}, default: []
    end

    flush()

    # Consolidate duplicate rows (same uuid, different user_ids):
    # For each uuid with multiple rows, keep the most recently updated one,
    # merge deleted_by arrays, and set player_ids to all distinct user_ids.
    execute """
    WITH ranked AS (
      SELECT id, uuid, user_id, deleted_by,
             ROW_NUMBER() OVER (PARTITION BY uuid ORDER BY updated_at DESC) AS rn
      FROM replays
    ),
    aggregated AS (
      SELECT uuid,
             array_agg(DISTINCT user_id) AS all_player_ids,
             (SELECT array_agg(DISTINCT val)
              FROM ranked r2, unnest(COALESCE(r2.deleted_by, ARRAY[]::integer[])) AS val
              WHERE r2.uuid = ranked.uuid) AS merged_deleted_by
      FROM ranked
      GROUP BY uuid
      HAVING count(*) > 1
    )
    UPDATE replays
    SET player_ids = aggregated.all_player_ids,
        deleted_by = COALESCE(aggregated.merged_deleted_by, ARRAY[]::integer[])
    FROM aggregated, ranked
    WHERE replays.uuid = aggregated.uuid
      AND replays.id = ranked.id
      AND ranked.uuid = aggregated.uuid
      AND ranked.rn = 1
    """

    # Delete the non-keeper duplicate rows
    execute """
    WITH ranked AS (
      SELECT id, uuid,
             ROW_NUMBER() OVER (PARTITION BY uuid ORDER BY updated_at DESC) AS rn
      FROM replays
    )
    DELETE FROM replays
    WHERE id IN (SELECT id FROM ranked WHERE rn > 1)
    """

    # For non-duplicate rows, backfill player_ids with [user_id]
    execute """
    UPDATE replays
    SET player_ids = ARRAY[user_id]
    WHERE player_ids = ARRAY[]::integer[] OR player_ids IS NULL
    """

    # Add unique index on uuid
    create unique_index(:replays, [:uuid])
  end

  def down do
    drop_if_exists unique_index(:replays, [:uuid])

    alter table(:replays) do
      remove :player_ids
    end
  end
end
