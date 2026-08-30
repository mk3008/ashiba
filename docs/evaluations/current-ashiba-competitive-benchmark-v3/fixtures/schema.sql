CREATE TYPE {{schema}}.ticket_status AS ENUM ('open', 'pending', 'closed');
CREATE TYPE {{schema}}.order_state AS ENUM ('paid', 'refunded', 'void');
CREATE DOMAIN {{schema}}.money_cents AS bigint CHECK (VALUE >= 0);

CREATE TABLE {{schema}}.tickets (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  title text NOT NULL,
  status {{schema}}.ticket_status NOT NULL,
  assignee text NULL,
  priority integer NOT NULL CHECK (priority BETWEEN 1 AND 5),
  created_at timestamptz NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE {{schema}}.ticket_audit (
  audit_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  ticket_id bigint NOT NULL REFERENCES {{schema}}.tickets(id),
  action text NOT NULL,
  detail text NOT NULL,
  created_at timestamptz NOT NULL
);

CREATE TABLE {{schema}}.failure_injection (
  name text PRIMARY KEY,
  enabled boolean NOT NULL DEFAULT false
);

CREATE FUNCTION {{schema}}.raise_when_injected() RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = {{schema}}, pg_temp
AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM {{schema}}.failure_injection
    WHERE name = TG_ARGV[0] AND enabled
  ) THEN
    RAISE EXCEPTION 'runner-injected failure: %', TG_ARGV[0];
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER ticket_audit_failure
AFTER INSERT ON {{schema}}.ticket_audit
FOR EACH ROW EXECUTE FUNCTION {{schema}}.raise_when_injected('assign_audit');

CREATE TABLE {{schema}}.accounts (
  account_id bigint PRIMARY KEY,
  balance_cents {{schema}}.money_cents NOT NULL
);

CREATE TABLE {{schema}}.transfer_audit (
  audit_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  from_account_id bigint NOT NULL REFERENCES {{schema}}.accounts(account_id),
  to_account_id bigint NOT NULL REFERENCES {{schema}}.accounts(account_id),
  amount_cents {{schema}}.money_cents NOT NULL,
  note text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT TIMESTAMPTZ '2026-01-01 00:00:00+00'
);

CREATE TRIGGER transfer_audit_failure
AFTER INSERT ON {{schema}}.transfer_audit
FOR EACH ROW EXECUTE FUNCTION {{schema}}.raise_when_injected('transfer_audit');

CREATE TABLE {{schema}}.work_items (
  id bigint PRIMARY KEY,
  state text NOT NULL CHECK (state IN ('queued', 'claimed')),
  claimed_by text NULL
);

CREATE TRIGGER work_item_claim_failure
BEFORE UPDATE OF state ON {{schema}}.work_items
FOR EACH ROW WHEN (NEW.state = 'claimed')
EXECUTE FUNCTION {{schema}}.raise_when_injected('claim_update');

CREATE TABLE {{schema}}.customers (
  customer_id bigint PRIMARY KEY,
  display_name text NOT NULL,
  region text NOT NULL,
  tags text[] NOT NULL,
  profile jsonb NOT NULL
);

CREATE TABLE {{schema}}.orders (
  order_id bigint PRIMARY KEY,
  customer_id bigint NULL REFERENCES {{schema}}.customers(customer_id),
  state {{schema}}.order_state NOT NULL,
  total_cents {{schema}}.money_cents NOT NULL,
  created_at timestamptz NOT NULL
);
