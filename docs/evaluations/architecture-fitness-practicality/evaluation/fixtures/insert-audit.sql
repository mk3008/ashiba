insert into ticket_audit (ticket_id, actor_id, note)
values (:ticket_id, :actor_id, :note)
returning audit_id;
