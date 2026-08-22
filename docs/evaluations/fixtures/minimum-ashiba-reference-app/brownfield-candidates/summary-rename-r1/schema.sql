create table customers (
  id bigint primary key,
  name text not null
);

create table work_items (
  id bigint primary key,
  customer_id bigint references customers(id),
  summary text not null,
  priority text not null check (priority in ('urgent', 'normal', 'low')),
  assignee text null,
  state text not null check (state in ('ready', 'claimed', 'done')),
  created_at timestamptz not null,
  version integer not null default 0
);

create table claim_audit (
  id bigint generated always as identity primary key,
  work_item_id bigint not null references work_items(id),
  claimant text not null,
  context jsonb not null check (context ? 'source'),
  claimed_at timestamptz not null default transaction_timestamp()
);
