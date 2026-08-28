select id, customer_id, status, created_at
from perf_tickets
where customer_id = :customerId
order by id
limit :limit;
