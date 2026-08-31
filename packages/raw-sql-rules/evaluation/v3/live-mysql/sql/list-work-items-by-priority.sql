SELECT id, owner_id, state, priority, amount, metadata, created_at
FROM work_items
WHERE owner_id = :ownerId
  AND (:state IS NULL OR state = :state)
ORDER BY priority DESC, id DESC;
