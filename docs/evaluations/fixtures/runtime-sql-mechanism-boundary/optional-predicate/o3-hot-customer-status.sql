select id from runtime_boundary_items where customer_id = :customer_id::bigint and status = :status::text order by created_at desc, id asc limit :limit::integer;
