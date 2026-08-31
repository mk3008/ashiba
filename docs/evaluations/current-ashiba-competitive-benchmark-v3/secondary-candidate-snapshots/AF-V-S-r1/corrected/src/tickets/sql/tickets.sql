-- name: ListTickets :many
SELECT id, title, status, assignee, priority, created_at, metadata
FROM tickets
WHERE (sqlc.narg('status')::ticket_status IS NULL OR status = sqlc.narg('status')::ticket_status)
  AND (NOT sqlc.arg('has_assignee')::boolean OR assignee IS NOT DISTINCT FROM sqlc.narg('assignee')::text)
ORDER BY
  CASE WHEN sqlc.arg('sort')::text = 'id' AND sqlc.arg('direction')::text = 'asc' THEN id END ASC,
  CASE WHEN sqlc.arg('sort')::text = 'id' AND sqlc.arg('direction')::text = 'desc' THEN id END DESC,
  CASE WHEN sqlc.arg('sort')::text = 'priority' AND sqlc.arg('direction')::text = 'asc' THEN priority END ASC,
  CASE WHEN sqlc.arg('sort')::text = 'priority' AND sqlc.arg('direction')::text = 'desc' THEN priority END DESC,
  CASE WHEN sqlc.arg('sort')::text = 'createdAt' AND sqlc.arg('direction')::text = 'asc' THEN created_at END ASC,
  CASE WHEN sqlc.arg('sort')::text = 'createdAt' AND sqlc.arg('direction')::text = 'desc' THEN created_at END DESC,
  id ASC
OFFSET sqlc.arg('offset')::integer
LIMIT sqlc.arg('limit')::integer;

-- name: GetTicket :one
SELECT id, title, status, assignee, priority, created_at, metadata
FROM tickets WHERE id = sqlc.arg('id')::bigint;

-- name: CreateTicket :one
INSERT INTO tickets (title, status, assignee, priority, created_at, metadata)
VALUES (sqlc.arg('title')::text, sqlc.arg('status')::ticket_status, sqlc.narg('assignee')::text,
        sqlc.arg('priority')::integer, CURRENT_TIMESTAMP, sqlc.arg('metadata')::jsonb)
RETURNING id, title, status, assignee, priority, created_at, metadata;

-- name: AssignTicket :one
UPDATE tickets SET assignee = sqlc.narg('assignee')::text
WHERE id = sqlc.arg('id')::bigint RETURNING id, assignee;

-- name: InsertTicketAssignmentAudit :exec
INSERT INTO ticket_audit (ticket_id, action, detail, created_at)
VALUES (sqlc.arg('ticket_id')::bigint, 'assigned',
        COALESCE(sqlc.narg('assignee')::text, 'unassigned'), CURRENT_TIMESTAMP);
