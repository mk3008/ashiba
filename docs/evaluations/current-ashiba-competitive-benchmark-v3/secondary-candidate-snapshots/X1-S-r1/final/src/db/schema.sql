CREATE TYPE ticket_status AS ENUM ('open', 'pending', 'closed');

CREATE TABLE tickets (
  id bigint PRIMARY KEY,
  status ticket_status NOT NULL,
  assignee text,
  priority integer NOT NULL
);

CREATE TABLE ticket_tags (
  ticket_id bigint NOT NULL,
  tag text NOT NULL
);
