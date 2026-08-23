select id, customer_id, subject, status, priority, assignee_id, created_at, updated_at
from tickets where id = :id;
