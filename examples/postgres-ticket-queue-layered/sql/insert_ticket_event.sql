INSERT INTO ticket_events (ticket_id, kind)
VALUES (:ticketId, :kind)
RETURNING id, ticket_id, kind, created_at;
