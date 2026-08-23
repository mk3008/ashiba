create table runtime_boundary_items (
  id bigint primary key,
  customer_id bigint null,
  assignee text null,
  status text null,
  category text null,
  created_at timestamptz not null,
  priority text not null,
  name text not null
);

create index runtime_boundary_items_customer_idx on runtime_boundary_items(customer_id);
create index runtime_boundary_items_assignee_idx on runtime_boundary_items(assignee);
create index runtime_boundary_items_status_idx on runtime_boundary_items(status);
create index runtime_boundary_items_created_idx on runtime_boundary_items(created_at);
