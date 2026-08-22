insert into work_items (id, customer_id, name, priority, assignee, state, created_at)
values (:id::bigint, :customer_id::bigint, :name::text, :priority::text, :assignee::text, 'ready', transaction_timestamp())
returning id, name, priority, assignee, state;
