-- Leadership receives aggregate health and recency, without work-item titles.
SELECT
  :ownerId AS owner_id,
  COUNT(w.id) AS total_work_items,
  COALESCE(SUM(CASE WHEN w.state = 'open' THEN 1 ELSE 0 END), 0) AS open_work_items,
  COALESCE(SUM(CASE WHEN w.state = 'in_progress' THEN 1 ELSE 0 END), 0) AS in_progress_work_items,
  COALESCE(SUM(CASE WHEN w.state = 'done' THEN 1 ELSE 0 END), 0) AS completed_work_items,
  COALESCE(SUM(w.priority), 0) AS total_priority,
  MAX(w.updated_at) AS latest_activity_at
FROM work_items AS w
WHERE w.owner_id = :ownerId;
