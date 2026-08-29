select
    o.order_id
    , o.created_at
    , c.display_name as customer_name
    , o.status
    , o.total_cents
from
    orders as o
    join customers as c on c.customer_id = o.customer_id
where
    o.store_id = :store_id
    and (:status is null or o.status = :status)
    and o.created_at >= :created_after
order by
    o.created_at desc
    , o.order_id desc
limit :limit;
