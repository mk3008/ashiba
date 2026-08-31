-- Stable tie breakers keep priority listings deterministic.
SELECT id, owner_id, state, priority, title, updated_at
FROM work_items
WHERE owner_id = :ownerId
  AND (:state IS NULL OR state = :state)
ORDER BY priority DESC, updated_at DESC, id DESC
LIMIT :limit;
