create table tickets (
  id bigint primary key,
  subject text not null,
  status text not null,
  assignee_id text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table ticket_events (
  id bigint generated always as identity primary key,
  ticket_id bigint not null references tickets(id),
  event_type text not null,
  actor_id text not null,
  created_at timestamptz not null default now()
);
