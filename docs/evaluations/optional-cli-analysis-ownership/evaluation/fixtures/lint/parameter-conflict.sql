select
    t.ticket_id
from
    public.tickets as t
where
    t.ticket_id = :value
    or t.status = :value;
