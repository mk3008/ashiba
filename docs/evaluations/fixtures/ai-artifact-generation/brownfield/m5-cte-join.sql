with visible_items as (
  select w.id, w.name, w.priority, w.assignee, w.customer_id, w.created_at
  from work_items w
  where w.state <> 'done'
    and (:assignee_supplied = false or (:assignee_is_null = true and w.assignee is null) or (:assignee_is_null = false and w.assignee = :assignee))
    and (:customer_id_supplied = false or (:customer_id_is_null = true and w.customer_id is null) or (:customer_id_is_null = false and w.customer_id = :customer_id::bigint))
    and (:priority_supplied = false or (:priority_is_null = true and w.priority is null) or (:priority_is_null = false and w.priority = :priority))
)
select v.id, v.name, v.priority, c.name as customer_name
from visible_items v
join customers c on c.id = v.customer_id
order by v.id asc
limit :limit::integer offset :offset::integer;
