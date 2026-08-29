select
    t.missing_status
from
    public.tickets as t
where
    t.status = :status;
