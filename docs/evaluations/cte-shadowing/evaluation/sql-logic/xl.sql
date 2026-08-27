select o.id, o.scenario_token, o.priority
from orders o
join customers c on c.id = o.customer_id
join warehouses w on w.id = o.warehouse_id
join order_items oi on oi.order_id = o.id
join inventory i on i.warehouse_id = o.warehouse_id and i.product_id = oi.product_id
join product_rules r on r.product_id = oi.product_id
where o.scenario_token = :token
  and o.status = 'open'
  and c.blocked = false
  and w.active = true
  and r.enabled = true
  and exists (
    select 1 from payments p
    where p.order_id = o.id and p.status = 'paid'
  )
  and not exists (
    select 1 from shipments s
    where s.order_id = o.id and s.status = 'shipped'
  )
group by o.id, o.scenario_token, o.priority
having sum(oi.quantity) > 0
   and bool_and(i.available_qty >= oi.quantity)
order by max(r.priority) desc, o.priority desc, o.id
limit 1;
