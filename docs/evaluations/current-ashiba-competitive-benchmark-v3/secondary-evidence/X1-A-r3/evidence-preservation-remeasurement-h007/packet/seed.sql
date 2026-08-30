INSERT INTO {{schema}}.tickets (id, title, status, assignee, priority, created_at, metadata)
OVERRIDING SYSTEM VALUE VALUES
  (101, 'Cannot sign in', 'open', 'alice', 5, TIMESTAMPTZ '2026-01-01 09:00:00+00', '{"channel":"email"}'),
  (102, 'Export is slow', 'pending', 'bob', 3, TIMESTAMPTZ '2026-01-01 10:00:00+00', '{"channel":"web"}'),
  (103, 'Password reset', 'open', NULL, 5, TIMESTAMPTZ '2026-01-01 11:00:00+00', '{"channel":"email"}'),
  (104, 'Close account', 'closed', 'alice', 1, TIMESTAMPTZ '2026-01-01 12:00:00+00', '{"channel":"web"}');

INSERT INTO {{schema}}.accounts (account_id, balance_cents) VALUES
  (7001, 10000),
  (7002, 5000);

INSERT INTO {{schema}}.failure_injection (name, enabled) VALUES
  ('assign_audit', false),
  ('transfer_audit', false),
  ('claim_update', false);

INSERT INTO {{schema}}.work_items (id, state, claimed_by) VALUES
  (8001, 'queued', NULL),
  (8002, 'queued', NULL),
  (8003, 'queued', NULL);

INSERT INTO {{schema}}.customers (customer_id, display_name, region, tags, profile) VALUES
  (9001, 'Acme', 'east', ARRAY['vip', 'beta'], '{"tier":"gold","active":true}'),
  (9002, 'Beta Co', 'east', ARRAY['standard'], '{"tier":"gold","active":true}'),
  (9003, 'Gamma', 'west', ARRAY['vip'], '{"tier":"silver","active":true}'),
  (9004, 'No Orders', 'east', ARRAY['vip'], '{"tier":"gold","active":false}');

INSERT INTO {{schema}}.orders (order_id, customer_id, state, total_cents, created_at) VALUES
  (9101, 9001, 'paid', 1200, TIMESTAMPTZ '2026-02-01 09:00:00+00'),
  (9102, 9001, 'paid', 800, TIMESTAMPTZ '2026-02-02 09:00:00+00'),
  (9103, 9002, 'paid', 5000, TIMESTAMPTZ '2026-02-03 09:00:00+00'),
  (9104, 9002, 'refunded', 9000, TIMESTAMPTZ '2026-02-04 09:00:00+00'),
  (9105, 9003, 'paid', 100, TIMESTAMPTZ '2026-02-05 09:00:00+00'),
  (9106, NULL, 'paid', 999, TIMESTAMPTZ '2026-02-06 09:00:00+00');
