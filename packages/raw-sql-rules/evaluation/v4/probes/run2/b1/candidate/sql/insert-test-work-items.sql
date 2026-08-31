INSERT INTO work_items (owner_id, title, state, priority, updated_at)
VALUES
  (:ownerId, :lowTitle, :openState, :lowPriority, :lowUpdatedAt),
  (:ownerId, :highTitle, :openState, :highPriority, :highUpdatedAt);
