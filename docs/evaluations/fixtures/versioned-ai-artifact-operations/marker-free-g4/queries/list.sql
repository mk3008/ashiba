WITH active_work_items AS (
  SELECT
    w.id,
    w.name,
    w.priority,
    w.created_at
  FROM work_items AS w
  WHERE w.state <> :doneState
)
SELECT
  w.id,
  w.name,
  w.priority,
  w.created_at
FROM active_work_items AS w
ORDER BY w.id ASC;
