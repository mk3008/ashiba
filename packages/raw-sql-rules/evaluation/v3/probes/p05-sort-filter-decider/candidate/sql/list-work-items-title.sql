-- Case-insensitive title ordering is stable on the work-item id.
SELECT id, owner_id, state, priority, title, updated_at
FROM work_items
WHERE owner_id = :ownerId
  AND (:state IS NULL OR state = :state)
ORDER BY title COLLATE NOCASE ASC, id ASC
LIMIT :limit;
