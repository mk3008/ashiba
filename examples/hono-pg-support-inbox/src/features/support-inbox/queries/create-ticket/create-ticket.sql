insert into public.tickets(
    customer_id
    , subject
    , status
    , priority
    , language
    , channel
    , sla_due_at
    , created_at
    , updated_at
)
values
    (:customer_id, :subject, :status, :priority, :language, :channel, :sla_due_at, :created_at, :updated_at)
returning
    ticket_id
    , customer_id
    , subject
    , status
    , priority
    , language
    , channel
    , sla_due_at
    , created_at
    , updated_at
    , version_key
    , metadata;
