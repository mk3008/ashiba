INSERT INTO work_items (owner_id, title, state, priority, amount, updated_at)
VALUES
  (:ownerId, :lowTitle, :openState, :lowPriority, :lowAmount, :lowUpdatedAt),
  (:ownerId, :highTitle, :openState, :highPriority, :highAmount, :highUpdatedAt);
