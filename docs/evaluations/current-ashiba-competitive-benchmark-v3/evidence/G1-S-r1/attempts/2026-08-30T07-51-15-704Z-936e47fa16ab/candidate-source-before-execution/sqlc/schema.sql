CREATE TYPE ticket_status AS ENUM ('open', 'pending', 'closed');

CREATE TABLE tickets (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  title text NOT NULL,
  status ticket_status NOT NULL,
  assignee text NULL,
  priority integer NOT NULL CHECK (priority BETWEEN 1 AND 5),
  created_at timestamptz NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE ticket_audit (
  audit_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  ticket_id bigint NOT NULL REFERENCES tickets(id),
  action text NOT NULL,
  detail text NOT NULL,
  created_at timestamptz NOT NULL
);
