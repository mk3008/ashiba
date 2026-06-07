select
    t.ticket_id,
    t.subject,
    t.status,
    t.priority,
    t.language,
    t.channel,
    t.sla_due_at,
    t.created_at,
    t.updated_at,
    c.name as customer_name,
    c.tier as customer_tier,
    tm.message_id,
    tm.sender_name,
    tm.sender_role,
    tm.body as message_body,
    tm.created_at as message_created_at
from public.tickets t
join public.customers c on c.customer_id = t.customer_id
left join public.ticket_messages tm on tm.ticket_id = t.ticket_id
where t.ticket_id = :ticketId
order by tm.created_at asc, tm.message_id asc
