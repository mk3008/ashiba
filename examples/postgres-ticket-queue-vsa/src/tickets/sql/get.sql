select
  t.id,
  t.subject,
  t.status,
  t.assignee_id,
  t.created_at,
  count(e.id)::int as audit_count
from tickets t
left join ticket_events e on e.ticket_id = t.id
where t.id = :ticketId
group by t.id, t.subject, t.status, t.assignee_id, t.created_at;
