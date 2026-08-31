-- name: ListTicketsByIdAsc :many
SELECT id, title, status, assignee, priority, created_at, metadata
FROM tickets
WHERE (sqlc.narg(status)::ticket_status IS NULL OR status = sqlc.narg(status)::ticket_status)
  AND (NOT sqlc.arg(filter_unassigned)::boolean OR assignee IS NULL)
  AND (NOT sqlc.arg(filter_assignee)::boolean OR assignee = sqlc.narg(assignee)::text)
ORDER BY id ASC
LIMIT sqlc.arg(page_limit)::integer OFFSET sqlc.arg(page_offset)::integer;

-- name: ListTicketsByIdDesc :many
SELECT id, title, status, assignee, priority, created_at, metadata
FROM tickets
WHERE (sqlc.narg(status)::ticket_status IS NULL OR status = sqlc.narg(status)::ticket_status)
  AND (NOT sqlc.arg(filter_unassigned)::boolean OR assignee IS NULL)
  AND (NOT sqlc.arg(filter_assignee)::boolean OR assignee = sqlc.narg(assignee)::text)
ORDER BY id DESC, id ASC
LIMIT sqlc.arg(page_limit)::integer OFFSET sqlc.arg(page_offset)::integer;

-- name: ListTicketsByPriorityAsc :many
SELECT id, title, status, assignee, priority, created_at, metadata
FROM tickets
WHERE (sqlc.narg(status)::ticket_status IS NULL OR status = sqlc.narg(status)::ticket_status)
  AND (NOT sqlc.arg(filter_unassigned)::boolean OR assignee IS NULL)
  AND (NOT sqlc.arg(filter_assignee)::boolean OR assignee = sqlc.narg(assignee)::text)
ORDER BY priority ASC, id ASC
LIMIT sqlc.arg(page_limit)::integer OFFSET sqlc.arg(page_offset)::integer;

-- name: ListTicketsByPriorityDesc :many
SELECT id, title, status, assignee, priority, created_at, metadata
FROM tickets
WHERE (sqlc.narg(status)::ticket_status IS NULL OR status = sqlc.narg(status)::ticket_status)
  AND (NOT sqlc.arg(filter_unassigned)::boolean OR assignee IS NULL)
  AND (NOT sqlc.arg(filter_assignee)::boolean OR assignee = sqlc.narg(assignee)::text)
ORDER BY priority DESC, id ASC
LIMIT sqlc.arg(page_limit)::integer OFFSET sqlc.arg(page_offset)::integer;

-- name: ListTicketsByCreatedAtAsc :many
SELECT id, title, status, assignee, priority, created_at, metadata
FROM tickets
WHERE (sqlc.narg(status)::ticket_status IS NULL OR status = sqlc.narg(status)::ticket_status)
  AND (NOT sqlc.arg(filter_unassigned)::boolean OR assignee IS NULL)
  AND (NOT sqlc.arg(filter_assignee)::boolean OR assignee = sqlc.narg(assignee)::text)
ORDER BY created_at ASC, id ASC
LIMIT sqlc.arg(page_limit)::integer OFFSET sqlc.arg(page_offset)::integer;

-- name: ListTicketsByCreatedAtDesc :many
SELECT id, title, status, assignee, priority, created_at, metadata
FROM tickets
WHERE (sqlc.narg(status)::ticket_status IS NULL OR status = sqlc.narg(status)::ticket_status)
  AND (NOT sqlc.arg(filter_unassigned)::boolean OR assignee IS NULL)
  AND (NOT sqlc.arg(filter_assignee)::boolean OR assignee = sqlc.narg(assignee)::text)
ORDER BY created_at DESC, id ASC
LIMIT sqlc.arg(page_limit)::integer OFFSET sqlc.arg(page_offset)::integer;

-- name: GetTicket :one
SELECT id, title, status, assignee, priority, created_at, metadata
FROM tickets
WHERE id = sqlc.arg(id)::bigint;

-- name: CreateTicket :one
INSERT INTO tickets (title, status, assignee, priority, created_at, metadata)
VALUES (sqlc.arg(title)::text, sqlc.arg(status)::ticket_status, sqlc.narg(assignee)::text,
        sqlc.arg(priority)::integer, CURRENT_TIMESTAMP, sqlc.arg(metadata)::jsonb)
RETURNING id, title, status, assignee, priority, created_at, metadata;

-- name: AssignTicket :one
UPDATE tickets
SET assignee = sqlc.narg(assignee)::text
WHERE id = sqlc.arg(id)::bigint
RETURNING id, assignee;

-- name: InsertTicketAudit :exec
INSERT INTO ticket_audit (ticket_id, action, detail, created_at)
VALUES (sqlc.arg(ticket_id)::bigint, 'assigned', sqlc.arg(detail)::text, CURRENT_TIMESTAMP);
