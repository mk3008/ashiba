CREATE DOMAIN money_cents AS bigint CHECK (VALUE >= 0);

CREATE TABLE accounts (
  account_id bigint PRIMARY KEY,
  balance_cents money_cents NOT NULL
);

CREATE TABLE transfer_audit (
  audit_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  from_account_id bigint NOT NULL REFERENCES accounts(account_id),
  to_account_id bigint NOT NULL REFERENCES accounts(account_id),
  amount_cents money_cents NOT NULL,
  note text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT TIMESTAMPTZ '2026-01-01 00:00:00+00'
);
