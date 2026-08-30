CREATE TABLE work_items (
  id bigint PRIMARY KEY,
  state text NOT NULL CHECK (state IN ('queued', 'claimed')),
  claimed_by text NULL
);
