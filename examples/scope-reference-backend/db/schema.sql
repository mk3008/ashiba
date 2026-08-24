create table tickets (
  id serial primary key,
  customer_id integer not null,
  subject text not null,
  status text not null check (status in ('open', 'pending', 'closed')),
  priority text not null check (priority in ('urgent', 'normal', 'low')),
  assignee_id integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table ticket_events (
  id serial primary key,
  ticket_id integer not null references tickets(id),
  event_type text not null,
  actor_id integer not null,
  note text check (char_length(coalesce(note, '')) <= 1000),
  created_at timestamptz not null default now()
);
