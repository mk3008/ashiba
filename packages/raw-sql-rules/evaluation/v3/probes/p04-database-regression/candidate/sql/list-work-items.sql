SELECT id, owner_id, state, priority, amount, metadata, result, created_at
FROM p04_work_items
WHERE owner_id = :ownerId
  AND (:state IS NULL OR state = :state)
ORDER BY created_at DESC, id DESC;
