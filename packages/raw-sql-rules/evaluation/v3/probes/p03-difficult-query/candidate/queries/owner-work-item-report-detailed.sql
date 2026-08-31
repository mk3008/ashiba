-- The owner audience may see the latest item's identifying fields as well as totals.
WITH owner_items AS (
  SELECT id, state, priority, title, updated_at
  FROM work_items
  WHERE owner_id = :ownerId
), aggregates AS (
  SELECT
    COUNT(*) AS total_work_items,
    COALESCE(SUM(CASE WHEN state = 'open' THEN 1 ELSE 0 END), 0) AS open_work_items,
    COALESCE(SUM(CASE WHEN state = 'in_progress' THEN 1 ELSE 0 END), 0) AS in_progress_work_items,
    COALESCE(SUM(CASE WHEN state = 'done' THEN 1 ELSE 0 END), 0) AS completed_work_items,
    COALESCE(SUM(priority), 0) AS total_priority
  FROM owner_items
), latest AS (
  SELECT id, title, state, updated_at
  FROM owner_items
  ORDER BY updated_at DESC, id DESC
  LIMIT 1
)
SELECT
  :ownerId AS owner_id,
  aggregates.total_work_items,
  aggregates.open_work_items,
  aggregates.in_progress_work_items,
  aggregates.completed_work_items,
  aggregates.total_priority,
  latest.id AS latest_work_item_id,
  latest.title AS latest_work_item_title,
  latest.state AS latest_work_item_state,
  latest.updated_at AS latest_activity_at
FROM aggregates
LEFT JOIN latest ON 1 = 1;
