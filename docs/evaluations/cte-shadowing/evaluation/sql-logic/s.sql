select id, scenario_token
from orders
where scenario_token = :token
  and status = 'open'
  and priority >= 10
order by priority desc, id
limit 1;
