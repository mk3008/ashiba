select i.id, i.priority, i.created_at, i.name
from items i
where i.status = :status::text
/* ORDER_BY_INSERTION */
limit 50;
