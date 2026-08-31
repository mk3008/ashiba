UPDATE work_items SET state = :nextState, updated_at = :updatedAt WHERE id = :workItemId;
