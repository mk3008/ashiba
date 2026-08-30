-- name: ListTickets :many
SELECT id::text, title, status::text, assignee, priority, created_at, metadata
FROM tickets
WHERE (NOT $1::boolean OR status = $2::ticket_status)
  AND (NOT $3::boolean OR assignee IS NOT DISTINCT FROM $4::text)
ORDER BY
  CASE WHEN $5::text = 'id' AND $6::text = 'asc' THEN id END ASC,
  CASE WHEN $5::text = 'id' AND $6::text = 'desc' THEN id END DESC,
  CASE WHEN $5::text = 'priority' AND $6::text = 'asc' THEN priority END ASC,
  CASE WHEN $5::text = 'priority' AND $6::text = 'desc' THEN priority END DESC,
  CASE WHEN $5::text = 'createdAt' AND $6::text = 'asc' THEN created_at END ASC,
  CASE WHEN $5::text = 'createdAt' AND $6::text = 'desc' THEN created_at END DESC,
  id ASC
OFFSET $7::integer LIMIT $8::integer;

-- name: GetTicket :one
SELECT id::text, title, status::text, assignee, priority, created_at, metadata
FROM tickets
WHERE id = $1::bigint;

-- name: CreateTicket :one
INSERT INTO tickets (title, status, assignee, priority, created_at, metadata)
VALUES ($1::text, $2::ticket_status, $3::text, $4::integer, CURRENT_TIMESTAMP, $5::jsonb)
RETURNING id::text, title, status::text, assignee, priority, created_at, metadata;

-- name: AssignTicket :one
UPDATE tickets
SET assignee = $2::text
WHERE id = $1::bigint
RETURNING id::text, assignee;

-- name: InsertTicketAudit :exec
INSERT INTO ticket_audit (ticket_id, action, detail, created_at)
VALUES ($1::bigint, $2::text, $3::text, CURRENT_TIMESTAMP);
