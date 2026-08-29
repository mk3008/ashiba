select t.id, t.subject, t.status, t.assignee_id, t.created_at, count(e.id)::int as audit_count
from tickets t left join ticket_events e on e.ticket_id = t.id
where (:status::text is null or t.status = :status) and (:assigneeId::bigint is null or t.assignee_id = :assigneeId)
group by t.id, t.subject, t.status, t.assignee_id, t.created_at
order by t.subject asc, t.id asc
limit :limit offset :offset;
