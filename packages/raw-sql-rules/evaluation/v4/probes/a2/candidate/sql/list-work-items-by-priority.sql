SELECT id, owner_id, title, state, priority, updated_at
FROM work_items
WHERE owner_id = ?
  AND (? IS NULL OR state = ?)
ORDER BY priority DESC, updated_at DESC
LIMIT ?;
