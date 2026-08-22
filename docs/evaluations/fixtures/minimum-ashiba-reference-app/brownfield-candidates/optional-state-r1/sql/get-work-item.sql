select w.id, w.name, w.priority, w.assignee, w.state, w.created_at, c.name as customer_name
from work_items w
left join customers c on c.id = w.customer_id
where w.id = :id::bigint;
