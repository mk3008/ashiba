create table tickets (
  id bigserial primary key,
  customer_id bigint not null,
  subject text not null,
  status text not null check (status in ('open', 'pending', 'closed')),
  priority text not null check (priority in ('urgent', 'normal', 'low')),
  assignee_id bigint,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table ticket_events (
  id bigserial primary key,
  ticket_id bigint not null references tickets(id),
  event_type text not null,
  actor_id bigint not null,
  note text check (char_length(coalesce(note, '')) <= 1000),
  created_at timestamptz not null default now()
);
