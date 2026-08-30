UPDATE tickets
SET assignee_id = :assigneeId
WHERE id = :ticketId
RETURNING id, subject, status, assignee_id, created_at;
