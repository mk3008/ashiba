insert into work_items (id, customer_id, summary, priority, assignee, state, created_at)
values (:id::bigint, :customer_id::bigint, :summary::text, :priority::text, :assignee::text, 'ready', transaction_timestamp())
returning id, summary, priority, assignee, state;
