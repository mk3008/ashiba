select w.id, w.name, w.priority, w.assignee, c.name as customer_name
from work_items w
left join customers c on c.id = w.customer_id
where w.state <> 'done'
  and w.name <> :excluded_name
  and (:assignee_supplied = false or (:assignee_is_null = true and w.assignee is null) or (:assignee_is_null = false and w.assignee = :assignee))
  and (:customer_id_supplied = false or (:customer_id_is_null = true and w.customer_id is null) or (:customer_id_is_null = false and w.customer_id = :customer_id::bigint))
  and (:priority_supplied = false or (:priority_is_null = true and w.priority is null) or (:priority_is_null = false and w.priority = :priority))
order by w.id asc
limit :limit::integer offset :offset::integer;
