defmodule DragnCards.Repo.Migrations.AlignCustomCardSideDatabaseIds do
  use Ecto.Migration

  # Custom content is keyed "author_id-<authorId>-<originalDatabaseId>", but
  # CustomContentController.create only rewrote the key, leaving each face's own
  # "databaseId" column holding the author's original id. That breaks the
  # invariant every other ingest path upholds (TsvProcess.process_rows and the
  # frontend's processArrayOfRows both key a card by its face A databaseId), so
  # card.databaseId and card.sides.A.databaseId disagreed for custom cards only.
  #
  # Rewrite stored rows to match. The rule is "a side's databaseId is the key it
  # is stored under", applied only where the side already holds a string, so the
  # null back faces that non-multi-sided cards carry stay null exactly as they do
  # for official content. Setting the value from the key makes this idempotent.

  def up, do: rewrite_side_database_ids("to_jsonb(cards.key)")

  # Reversible: the original id is the key with its "author_id-<n>-" prefix removed.
  def down, do: rewrite_side_database_ids("to_jsonb(regexp_replace(cards.key, '^author_id-\\d+-', ''))")

  defp rewrite_side_database_ids(new_value_sql) do
    execute("""
    UPDATE custom_card_db AS c
    SET card_db = fixed.card_db
    FROM (
      SELECT c2.id,
             jsonb_object_agg(cards.key, COALESCE(sides.value, cards.value)) AS card_db
      FROM custom_card_db AS c2
      CROSS JOIN LATERAL jsonb_each(c2.card_db) AS cards(key, value)
      LEFT JOIN LATERAL (
        SELECT jsonb_object_agg(
                 side.key,
                 CASE
                   WHEN jsonb_typeof(side.value -> 'databaseId') = 'string'
                   THEN jsonb_set(side.value, '{databaseId}', #{new_value_sql})
                   ELSE side.value
                 END
               ) AS value
        FROM jsonb_each(
               CASE
                 WHEN jsonb_typeof(cards.value) = 'object' THEN cards.value
                 ELSE '{}'::jsonb
               END
             ) AS side(key, value)
      ) AS sides ON true
      GROUP BY c2.id
    ) AS fixed
    WHERE c.id = fixed.id
      AND c.card_db IS DISTINCT FROM fixed.card_db
    """)
  end
end
