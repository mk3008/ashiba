select id from runtime_boundary_items
where true
  and customer_id = :customer_id::bigint
  and assignee = :assignee::text
  and status = :status::text
  and category = :category::text
  and priority = :priority::text
order by created_at desc, id asc limit :limit::integer;
