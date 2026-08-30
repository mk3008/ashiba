update tickets
set assignee_id = :assigneeId
where id = :ticketId
returning id, subject, status, assignee_id as "assigneeId", created_at as "createdAt";
