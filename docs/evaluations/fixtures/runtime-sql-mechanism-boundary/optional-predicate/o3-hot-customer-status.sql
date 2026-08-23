/* Selected hot asset: it is intentionally not one member of a 3^7 expansion. */
select i.id
from items i
left join customers c on c.id = i.customer_id
where i.customer_id = :customer_id::bigint
  and i.status = :status::text
order by i.created_at desc, i.id asc
limit 50;
