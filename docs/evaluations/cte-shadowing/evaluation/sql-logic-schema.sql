create table customers (
  id bigint primary key,
  scenario_token text not null,
  blocked boolean not null
);

create table warehouses (
  id bigint primary key,
  scenario_token text not null,
  active boolean not null
);

create table orders (
  id bigint primary key,
  scenario_token text not null,
  customer_id bigint not null,
  warehouse_id bigint,
  status text not null,
  priority integer not null
);

create table order_items (
  id bigint primary key,
  scenario_token text not null,
  order_id bigint not null,
  product_id bigint not null,
  quantity integer not null
);

create table inventory (
  id bigint primary key,
  scenario_token text not null,
  warehouse_id bigint not null,
  product_id bigint not null,
  available_qty integer not null
);

create table product_rules (
  id bigint primary key,
  scenario_token text not null,
  product_id bigint not null,
  enabled boolean not null,
  priority integer not null
);

create table payments (
  id bigint primary key,
  scenario_token text not null,
  order_id bigint not null,
  status text not null
);

create table shipments (
  id bigint primary key,
  scenario_token text not null,
  order_id bigint not null,
  status text not null
);
