create table if not exists tickets (
  id bigserial primary key,
  subject text not null,
  status text not null,
  assignee_id bigint,
  created_at timestamptz not null default now()
);

create table if not exists ticket_events (
  id bigserial primary key,
  ticket_id bigint not null references tickets(id),
  kind text not null,
  created_at timestamptz not null default now()
);
