select id, status
from perf_tickets
where customer_id = :customerId
limit :limit;
