select
  t.ticket_id,
  t.subject,
  t.status,
  c.name as customer_name
from tickets as t
join customers as c on c.customer_id = t.customer_id
where (:status::text is null or t.status = :status)
  and (:customer_id::bigint is null or t.customer_id = :customer_id)
order by t.ticket_id asc
limit :limit
offset :offset;
