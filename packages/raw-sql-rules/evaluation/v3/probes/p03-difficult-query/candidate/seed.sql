INSERT INTO users (id, email, display_name, created_at)
VALUES
  (1, 'ada@example.test', 'Ada Lovelace', '2026-08-01T09:00:00Z'),
  (2, 'grace@example.test', 'Grace Hopper', '2026-08-01T09:05:00Z');

INSERT INTO work_items (id, owner_id, state, priority, title, updated_at)
VALUES
  (10, 1, 'open', 3, 'Repair import', '2026-08-29T09:00:00Z'),
  (11, 1, 'in_progress', 5, 'Review queue', '2026-08-30T09:00:00Z'),
  (12, 1, 'done', 1, 'Audit export', '2026-08-31T10:00:00Z'),
  (20, 2, 'open', 2, 'Refresh keys', '2026-08-30T12:00:00Z');
