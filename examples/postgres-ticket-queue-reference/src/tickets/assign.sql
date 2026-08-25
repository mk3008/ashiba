update tickets set assignee_id = :assigneeId, updated_at = now() where id = :ticketId returning id, customer_id, subject, status, priority, assignee_id, created_at, updated_at;
