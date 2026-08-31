CREATE TYPE ticket_status AS ENUM ('open', 'pending', 'closed');

CREATE TABLE tickets (
  id bigint PRIMARY KEY,
  title text NOT NULL,
  status ticket_status NOT NULL,
  assignee text NULL,
  priority integer NOT NULL,
  created_at timestamptz NOT NULL,
  metadata jsonb NOT NULL
);

CREATE TABLE ticket_audit (
  audit_id bigint PRIMARY KEY,
  ticket_id bigint NOT NULL,
  action text NOT NULL,
  detail text NOT NULL,
  created_at timestamptz NOT NULL
);
