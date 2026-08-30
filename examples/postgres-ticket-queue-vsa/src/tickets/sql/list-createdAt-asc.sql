select
  t.id,
  t.subject,
  t.status,
  t.assignee_id as "assigneeId",
  t.created_at as "createdAt",
  count(te.id)::int as "auditCount"
from tickets t
left join ticket_events te on te.ticket_id = t.id
where (cast(:status as text) is null or t.status = :status)
  and (cast(:assigneeId as bigint) is null or t.assignee_id = :assigneeId)
group by t.id, t.subject, t.status, t.assignee_id, t.created_at
order by t.created_at asc, t.id asc
limit :limit offset :offset;
