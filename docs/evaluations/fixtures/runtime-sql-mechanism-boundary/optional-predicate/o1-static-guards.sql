select i.id
from items i
left join customers c on c.id = i.customer_id
where (:customer_supplied::boolean = false or (:customer_is_null::boolean and i.customer_id is null) or (not :customer_is_null::boolean and i.customer_id = :customer_id::bigint))
  and (:assignee_supplied::boolean = false or (:assignee_is_null::boolean and i.assignee is null) or (not :assignee_is_null::boolean and i.assignee = :assignee::text))
  and (:status_supplied::boolean = false or (:status_is_null::boolean and i.status is null) or (not :status_is_null::boolean and i.status = :status::text))
  and (:category_supplied::boolean = false or (:category_is_null::boolean and i.category is null) or (not :category_is_null::boolean and i.category = :category::text))
  and (:created_after_supplied::boolean = false or (:created_after_is_null::boolean and i.created_at is null) or (not :created_after_is_null::boolean and i.created_at >= :created_after::timestamptz))
  and (:created_before_supplied::boolean = false or (:created_before_is_null::boolean and i.created_at is null) or (not :created_before_is_null::boolean and i.created_at < :created_before::timestamptz))
  and (:priority_supplied::boolean = false or (:priority_is_null::boolean and i.priority is null) or (not :priority_is_null::boolean and i.priority = :priority::text))
order by i.created_at desc, i.id asc
limit 50;
