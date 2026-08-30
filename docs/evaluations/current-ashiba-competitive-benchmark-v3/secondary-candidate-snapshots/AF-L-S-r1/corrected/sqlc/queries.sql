-- name: GetTicket :one
SELECT id, title, status, assignee, priority, created_at, metadata
FROM tickets
WHERE id = sqlc.arg(id)::bigint;

-- name: CreateTicket :one
INSERT INTO tickets (title, status, assignee, priority, created_at, metadata)
VALUES (
  sqlc.arg(title)::text,
  sqlc.arg(status)::ticket_status,
  sqlc.arg(assignee)::text,
  sqlc.arg(priority)::integer,
  CURRENT_TIMESTAMP,
  COALESCE(sqlc.arg(metadata)::jsonb, '{}'::jsonb)
)
RETURNING id, title, status, assignee, priority, created_at, metadata;

-- name: UpdateTicketAssignee :one
UPDATE tickets
SET assignee = sqlc.arg(assignee)::text
WHERE id = sqlc.arg(id)::bigint
RETURNING id, assignee;

-- name: InsertAssignmentAudit :exec
INSERT INTO ticket_audit (ticket_id, action, detail, created_at)
VALUES (sqlc.arg(ticket_id)::bigint, 'assigned', sqlc.arg(detail)::text, CURRENT_TIMESTAMP);

-- name: ListTicketsByIdAsc :many
SELECT id, title, status, assignee, priority, created_at, metadata
FROM tickets
WHERE (NOT sqlc.arg(has_status)::boolean OR status = sqlc.arg(status)::ticket_status)
  AND (NOT sqlc.arg(has_assignee)::boolean OR assignee IS NOT DISTINCT FROM sqlc.arg(assignee)::text)
ORDER BY id ASC
OFFSET sqlc.arg(page_offset)::integer LIMIT sqlc.arg(page_limit)::integer;

-- name: ListTicketsByIdDesc :many
SELECT id, title, status, assignee, priority, created_at, metadata
FROM tickets
WHERE (NOT sqlc.arg(has_status)::boolean OR status = sqlc.arg(status)::ticket_status)
  AND (NOT sqlc.arg(has_assignee)::boolean OR assignee IS NOT DISTINCT FROM sqlc.arg(assignee)::text)
ORDER BY id DESC
OFFSET sqlc.arg(page_offset)::integer LIMIT sqlc.arg(page_limit)::integer;

-- name: ListTicketsByPriorityAsc :many
SELECT id, title, status, assignee, priority, created_at, metadata
FROM tickets
WHERE (NOT sqlc.arg(has_status)::boolean OR status = sqlc.arg(status)::ticket_status)
  AND (NOT sqlc.arg(has_assignee)::boolean OR assignee IS NOT DISTINCT FROM sqlc.arg(assignee)::text)
ORDER BY priority ASC, id ASC
OFFSET sqlc.arg(page_offset)::integer LIMIT sqlc.arg(page_limit)::integer;

-- name: ListTicketsByPriorityDesc :many
SELECT id, title, status, assignee, priority, created_at, metadata
FROM tickets
WHERE (NOT sqlc.arg(has_status)::boolean OR status = sqlc.arg(status)::ticket_status)
  AND (NOT sqlc.arg(has_assignee)::boolean OR assignee IS NOT DISTINCT FROM sqlc.arg(assignee)::text)
ORDER BY priority DESC, id ASC
OFFSET sqlc.arg(page_offset)::integer LIMIT sqlc.arg(page_limit)::integer;

-- name: ListTicketsByCreatedAtAsc :many
SELECT id, title, status, assignee, priority, created_at, metadata
FROM tickets
WHERE (NOT sqlc.arg(has_status)::boolean OR status = sqlc.arg(status)::ticket_status)
  AND (NOT sqlc.arg(has_assignee)::boolean OR assignee IS NOT DISTINCT FROM sqlc.arg(assignee)::text)
ORDER BY created_at ASC, id ASC
OFFSET sqlc.arg(page_offset)::integer LIMIT sqlc.arg(page_limit)::integer;

-- name: ListTicketsByCreatedAtDesc :many
SELECT id, title, status, assignee, priority, created_at, metadata
FROM tickets
WHERE (NOT sqlc.arg(has_status)::boolean OR status = sqlc.arg(status)::ticket_status)
  AND (NOT sqlc.arg(has_assignee)::boolean OR assignee IS NOT DISTINCT FROM sqlc.arg(assignee)::text)
ORDER BY created_at DESC, id ASC
OFFSET sqlc.arg(page_offset)::integer LIMIT sqlc.arg(page_limit)::integer;
