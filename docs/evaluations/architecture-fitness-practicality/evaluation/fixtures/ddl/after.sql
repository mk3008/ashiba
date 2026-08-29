create table customers (
  customer_id bigint primary key,
  name text not null,
  locale text not null
);

create table tickets (
  ticket_id bigint primary key,
  customer_id bigint not null references customers(customer_id),
  status text not null,
  subject text not null,
  created_at timestamptz not null,
  resolved_at timestamptz null
);

create table ticket_audit (
  audit_id bigint generated always as identity primary key,
  ticket_id bigint not null references tickets(ticket_id),
  actor_id bigint not null,
  note text not null
);
