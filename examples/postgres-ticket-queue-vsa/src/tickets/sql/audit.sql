insert into ticket_events (ticket_id, kind)
values (:ticketId, :kind)
returning id, ticket_id, kind, created_at;
