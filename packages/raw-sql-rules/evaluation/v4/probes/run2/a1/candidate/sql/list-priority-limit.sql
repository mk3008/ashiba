SELECT
  id,
  owner_id AS ownerId,
  title,
  state,
  priority,
  updated_at AS updatedAt
FROM work_items
WHERE owner_id = :ownerId
  AND (:state IS NULL OR state = :state)
ORDER BY priority DESC, id DESC
LIMIT :limit;
