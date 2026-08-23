select i.id
from items i
left join customers c on c.id = i.customer_id
where true
  /* Development-time metadata identifies each complete predicate range.
     Runtime removes only a range whose property is omitted. Null keeps
     "column is null"; values keep the parameterized comparison. */
  and i.customer_id = :customer_id::bigint
  and i.assignee = :assignee::text
  and i.status = :status::text
  and i.category = :category::text
  and i.created_at >= :created_after::timestamptz
  and i.created_at < :created_before::timestamptz
  and i.priority = :priority::text
order by i.created_at desc, i.id asc
limit 50;
