CREATE TABLE tickets (id bigint PRIMARY KEY, status text NOT NULL, assignee text NULL, priority integer NOT NULL);
CREATE TABLE ticket_tags (ticket_id bigint NOT NULL, tag text NOT NULL);
