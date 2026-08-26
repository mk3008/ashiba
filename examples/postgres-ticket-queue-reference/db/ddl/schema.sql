create table tickets (
  id bigint primary key,
  customer_id bigint not null,
  subject text not null,
  status text not null,
  priority text not null,
  assignee_id bigint,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table ticket_events (
  id bigserial primary key,
  ticket_id bigint not null references tickets(id),
  actor_id bigint not null,
  note text check (char_length(note) <= 1000),
  event_type text not null
);
