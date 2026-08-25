insert into tickets (id, customer_id, subject, status, priority, assignee_id, created_at, updated_at) values
  (1, 10, 'Cannot sign in', 'open', 'normal', null, '2026-01-01T00:00:00Z', now()),
  (2, 10, 'Billing question', 'open', 'urgent', 7, '2026-01-02T00:00:00Z', now()),
  (3, 11, 'Export issue', 'closed', 'low', 8, '2026-01-03T00:00:00Z', now()),
  (4, 12, 'Password reset', 'open', 'urgent', 7, '2026-01-04T00:00:00Z', now()),
  (5, 10, 'Duplicate urgent time', 'open', 'urgent', 7, '2026-01-02T00:00:00Z', now());
