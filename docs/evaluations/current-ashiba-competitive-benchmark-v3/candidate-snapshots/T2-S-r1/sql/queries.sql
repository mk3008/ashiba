-- name: ClaimQueuedWork :one
WITH next_work_item AS (
  SELECT id
  FROM work_items
  WHERE state = 'queued'
  ORDER BY id ASC
  FOR UPDATE SKIP LOCKED
  LIMIT 1
)
UPDATE work_items AS item
SET state = 'claimed',
    claimed_by = $1
FROM next_work_item
WHERE item.id = next_work_item.id
RETURNING item.id;
