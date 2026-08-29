select
    t.ticket_id
from
    public.tickets as t
where
    t.status = :status;
