-- Stable cursor ordering keeps rows deterministic when updated_at is tied.
SELECT id, owner_id, state, priority, title, updated_at
FROM work_items
WHERE owner_id = :ownerId
  AND (:state IS NULL OR state = :state)
ORDER BY updated_at DESC, id DESC
LIMIT :limit;
