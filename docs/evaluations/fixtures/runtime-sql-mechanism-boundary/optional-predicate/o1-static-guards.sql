select id from runtime_boundary_items
where (:customer_supplied::boolean = false or (:customer_is_null::boolean and customer_id is null) or (not :customer_is_null::boolean and customer_id = :customer_id::bigint))
  and (:assignee_supplied::boolean = false or (:assignee_is_null::boolean and assignee is null) or (not :assignee_is_null::boolean and assignee = :assignee::text))
  and (:status_supplied::boolean = false or (:status_is_null::boolean and status is null) or (not :status_is_null::boolean and status = :status::text))
  and (:category_supplied::boolean = false or (:category_is_null::boolean and category is null) or (not :category_is_null::boolean and category = :category::text))
  and (:priority_supplied::boolean = false or priority = :priority::text)
order by created_at desc, id asc limit :limit::integer;
