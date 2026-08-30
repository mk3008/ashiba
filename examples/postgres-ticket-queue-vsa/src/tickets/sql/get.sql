select
  t.id,
  t.subject,
  t.status,
  t.assignee_id as "assigneeId",
  t.created_at as "createdAt",
  count(te.id)::int as "auditCount"
from tickets t
left join ticket_events te on te.ticket_id = t.id
where t.id = :ticketId
group by t.id, t.subject, t.status, t.assignee_id, t.created_at;
