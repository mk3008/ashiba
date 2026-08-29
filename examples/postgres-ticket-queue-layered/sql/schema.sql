CREATE TABLE tickets (
  id bigserial PRIMARY KEY,
  subject text NOT NULL,
  status text NOT NULL,
  assignee_id bigint NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE ticket_events (
  id bigserial PRIMARY KEY,
  ticket_id bigint NOT NULL REFERENCES tickets(id),
  kind text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
