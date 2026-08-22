select w.id, w.name, w.priority, w.assignee, w.state, w.customer_id
from work_items w
where (:assignee_supplied::boolean = false or (:assignee_is_null::boolean = true and w.assignee is null) or (:assignee_is_null::boolean = false and w.assignee = :assignee::text))
  and (:customer_id_supplied::boolean = false or (:customer_id_is_null::boolean = true and w.customer_id is null) or (:customer_id_is_null::boolean = false and w.customer_id = :customer_id::bigint))
  and (:state_supplied::boolean = false or (:state_is_null::boolean = true and w.state is null) or (:state_is_null::boolean = false and w.state = :state::text))
order by w.id asc;
