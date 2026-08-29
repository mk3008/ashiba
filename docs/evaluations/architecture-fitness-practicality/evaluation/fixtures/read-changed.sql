select
  t.ticket_id,
  t.subject,
  t.status,
  c.name as customer_name,
  c.locale as customer_locale
from tickets as t
join customers as c on c.customer_id = t.customer_id
where (:status::text is null or t.status = :status)
  and (:customer_id::bigint is null or t.customer_id = :customer_id)
  and (:locale::text is null or c.locale = :locale)
order by t.ticket_id asc
limit :limit
offset :offset;
