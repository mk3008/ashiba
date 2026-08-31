CREATE TABLE work_items (
  id INTEGER PRIMARY KEY,
  owner_id INTEGER NOT NULL REFERENCES users(id),
  state TEXT NOT NULL,
  priority INTEGER NOT NULL,
  title TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
