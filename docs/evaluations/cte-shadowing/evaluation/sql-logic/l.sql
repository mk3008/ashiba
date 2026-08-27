select o.id, o.scenario_token
from orders o
join customers c on c.id = o.customer_id
join order_items oi on oi.order_id = o.id
join inventory i on i.warehouse_id = o.warehouse_id and i.product_id = oi.product_id
where o.scenario_token = :token
  and o.status = 'open'
  and c.blocked = false
group by o.id, o.scenario_token, o.priority
having sum(oi.quantity) > 0
   and bool_and(i.available_qty >= oi.quantity)
order by o.priority desc, o.id
limit 1;
