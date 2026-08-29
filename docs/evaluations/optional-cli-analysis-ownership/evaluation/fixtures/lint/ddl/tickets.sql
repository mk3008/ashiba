create table public.tickets(
    ticket_id bigint primary key
    , status text not null
    , created_at timestamptz not null
);
