SELECT id, owner_id, title, state, priority, updated_at
FROM work_items
WHERE owner_id = :ownerId
  AND (:state IS NULL OR state = :state)
ORDER BY updated_at DESC, id ASC
LIMIT :limit;
