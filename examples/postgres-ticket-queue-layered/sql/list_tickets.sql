SELECT
  t.id,
  t.subject,
  t.status,
  t.assignee_id,
  t.created_at,
  COUNT(te.id)::int AS audit_count,
  MAX(te.kind) AS latest_event_kind,
  MAX(te.created_at) AS latest_event_at
FROM tickets AS t
LEFT JOIN ticket_events AS te ON te.ticket_id = t.id
WHERE (:status::text IS NULL OR t.status = :status)
  AND (:assigneeId::bigint IS NULL OR t.assignee_id = :assigneeId)
GROUP BY t.id, t.subject, t.status, t.assignee_id, t.created_at
ORDER BY t.created_at ASC, t.id ASC
LIMIT :limit OFFSET :offset;
