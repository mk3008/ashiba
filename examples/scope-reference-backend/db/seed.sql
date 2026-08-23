insert into tickets (id, customer_id, subject, status, priority, assignee_id, created_at, updated_at) values
  (1, 10, 'Cannot sign in', 'open', 'urgent', null, '2026-01-01T09:00:00Z', '2026-01-01T09:00:00Z'),
  (2, 10, 'Billing question', 'open', 'normal', 7, '2026-01-02T09:00:00Z', '2026-01-02T09:00:00Z'),
  (3, 20, 'Export is slow', 'pending', 'low', 8, '2026-01-03T09:00:00Z', '2026-01-03T09:00:00Z'),
  (4, 20, 'Urgent outage', 'open', 'urgent', 7, '2026-01-04T09:00:00Z', '2026-01-04T09:00:00Z');

select setval('tickets_id_seq', 4, true);
