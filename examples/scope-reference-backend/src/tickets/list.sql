select id, customer_id, subject, status, priority, assignee_id, created_at, updated_at
from tickets t
where (cast(:status as text) is null or t.status = :status)
  and (cast(:customerId as bigint) is null or t.customer_id = :customerId)
  and (cast(:assigneeMode as text) = 'any'
    or (:assigneeMode = 'unassigned' and t.assignee_id is null)
    or (:assigneeMode = 'assigned' and t.assignee_id = cast(:assigneeId as bigint)))
order by t.id asc
limit cast(:limit as integer) offset cast(:offset as integer);
