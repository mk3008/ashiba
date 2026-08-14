select
    t.ticket_id
    , t.status
    , t.priority
    , t.tags
from public.tickets t
where
    (:status is null or t.status = :status)
    and t.ticket_id = any(:ticket_ids::integer[])
    and t.status <> :excluded_status
order by
    t.priority desc
    , t.ticket_id asc
limit :limit
offset :offset;
