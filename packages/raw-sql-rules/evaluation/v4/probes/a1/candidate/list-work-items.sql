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
ORDER BY
  CASE WHEN :sort = 'priority' THEN priority END DESC,
  CASE WHEN :sort = 'updatedAt' THEN updated_at END DESC,
  updated_at DESC,
  id ASC
LIMIT :limit;
