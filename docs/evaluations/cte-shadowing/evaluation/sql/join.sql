select t.id, t.created_at, e.note
from tickets t
left join ticket_events e on e.ticket_id = t.id
where t.id = :id
order by e.id;
