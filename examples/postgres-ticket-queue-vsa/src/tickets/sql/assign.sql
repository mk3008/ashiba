update tickets
set assignee_id = :assigneeId
where id = :ticketId
returning id, subject, status, assignee_id, created_at;
