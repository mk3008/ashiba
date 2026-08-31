CREATE TYPE order_state AS ENUM ('paid', 'refunded', 'void');

CREATE DOMAIN money_cents AS bigint CHECK (VALUE >= 0);

CREATE TABLE customers (
  customer_id bigint PRIMARY KEY,
  display_name text NOT NULL,
  region text NOT NULL,
  tags text[] NOT NULL,
  profile jsonb NOT NULL
);

CREATE TABLE orders (
  order_id bigint PRIMARY KEY,
  customer_id bigint NULL REFERENCES customers(customer_id),
  state order_state NOT NULL,
  total_cents money_cents NOT NULL,
  created_at timestamptz NOT NULL
);
