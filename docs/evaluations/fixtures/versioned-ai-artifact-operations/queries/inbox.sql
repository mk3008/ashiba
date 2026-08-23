WITH visible AS (
  SELECT i.id, i.priority, i.created_at
  FROM inbox AS i
  WHERE i.owner_id = :ownerId
)
SELECT * FROM visible
/* @sort:inbox */
ORDER BY priority DESC, created_at DESC, id DESC;
