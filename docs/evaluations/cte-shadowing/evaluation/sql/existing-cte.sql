with open_tickets as (
  select id, created_at from tickets where status = :status
)
select id, created_at from open_tickets order by id;
