select o.id, o.scenario_token, o.priority
from orders o
where o.scenario_token = :token
  and o.status = 'open'
  and exists (
    select 1 from payments p
    where p.order_id = o.id and p.status = 'paid'
  )
order by o.priority desc, o.id
limit 1;
