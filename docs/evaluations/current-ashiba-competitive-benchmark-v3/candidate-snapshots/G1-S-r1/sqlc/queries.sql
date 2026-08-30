-- name: ListTicketsByIdAsc :many
SELECT id::text AS id, title, status::text AS status, assignee, priority, created_at, metadata
FROM tickets
WHERE (sqlc.narg(status_filter)::ticket_status IS NULL OR status = sqlc.narg(status_filter)::ticket_status)
  AND (sqlc.arg(assignee_is_filtered)::boolean = FALSE OR assignee IS NOT DISTINCT FROM sqlc.narg(assignee_filter)::text)
ORDER BY id ASC
OFFSET sqlc.arg(offset_value)::integer LIMIT sqlc.arg(limit_value)::integer;

-- name: ListTicketsByIdDesc :many
SELECT id::text AS id, title, status::text AS status, assignee, priority, created_at, metadata
FROM tickets
WHERE (sqlc.narg(status_filter)::ticket_status IS NULL OR status = sqlc.narg(status_filter)::ticket_status)
  AND (sqlc.arg(assignee_is_filtered)::boolean = FALSE OR assignee IS NOT DISTINCT FROM sqlc.narg(assignee_filter)::text)
ORDER BY id DESC
OFFSET sqlc.arg(offset_value)::integer LIMIT sqlc.arg(limit_value)::integer;

-- name: ListTicketsByPriorityAsc :many
SELECT id::text AS id, title, status::text AS status, assignee, priority, created_at, metadata
FROM tickets
WHERE (sqlc.narg(status_filter)::ticket_status IS NULL OR status = sqlc.narg(status_filter)::ticket_status)
  AND (sqlc.arg(assignee_is_filtered)::boolean = FALSE OR assignee IS NOT DISTINCT FROM sqlc.narg(assignee_filter)::text)
ORDER BY priority ASC, id ASC
OFFSET sqlc.arg(offset_value)::integer LIMIT sqlc.arg(limit_value)::integer;

-- name: ListTicketsByPriorityDesc :many
SELECT id::text AS id, title, status::text AS status, assignee, priority, created_at, metadata
FROM tickets
WHERE (sqlc.narg(status_filter)::ticket_status IS NULL OR status = sqlc.narg(status_filter)::ticket_status)
  AND (sqlc.arg(assignee_is_filtered)::boolean = FALSE OR assignee IS NOT DISTINCT FROM sqlc.narg(assignee_filter)::text)
ORDER BY priority DESC, id ASC
OFFSET sqlc.arg(offset_value)::integer LIMIT sqlc.arg(limit_value)::integer;

-- name: ListTicketsByCreatedAtAsc :many
SELECT id::text AS id, title, status::text AS status, assignee, priority, created_at, metadata
FROM tickets
WHERE (sqlc.narg(status_filter)::ticket_status IS NULL OR status = sqlc.narg(status_filter)::ticket_status)
  AND (sqlc.arg(assignee_is_filtered)::boolean = FALSE OR assignee IS NOT DISTINCT FROM sqlc.narg(assignee_filter)::text)
ORDER BY created_at ASC, id ASC
OFFSET sqlc.arg(offset_value)::integer LIMIT sqlc.arg(limit_value)::integer;

-- name: ListTicketsByCreatedAtDesc :many
SELECT id::text AS id, title, status::text AS status, assignee, priority, created_at, metadata
FROM tickets
WHERE (sqlc.narg(status_filter)::ticket_status IS NULL OR status = sqlc.narg(status_filter)::ticket_status)
  AND (sqlc.arg(assignee_is_filtered)::boolean = FALSE OR assignee IS NOT DISTINCT FROM sqlc.narg(assignee_filter)::text)
ORDER BY created_at DESC, id ASC
OFFSET sqlc.arg(offset_value)::integer LIMIT sqlc.arg(limit_value)::integer;

-- name: GetTicket :one
SELECT id::text AS id, title, status::text AS status, assignee, priority, created_at, metadata
FROM tickets
WHERE id = sqlc.arg(id)::bigint;

-- name: CreateTicket :one
INSERT INTO tickets (title, status, assignee, priority, created_at, metadata)
VALUES (sqlc.arg(title)::text, sqlc.arg(status)::ticket_status, sqlc.narg(assignee)::text, sqlc.arg(priority)::integer, CURRENT_TIMESTAMP, sqlc.arg(metadata)::jsonb)
RETURNING id::text AS id, title, status::text AS status, assignee, priority, created_at, metadata;

-- name: UpdateTicketAssignee :one
UPDATE tickets
SET assignee = sqlc.narg(assignee)::text
WHERE id = sqlc.arg(id)::bigint
RETURNING id::text AS id, assignee;

-- name: InsertTicketAssignAudit :exec
INSERT INTO ticket_audit (ticket_id, action, detail, created_at)
VALUES (sqlc.arg(ticket_id)::bigint, 'assign', json_build_object('assignee', sqlc.narg(assignee)::text)::text, CURRENT_TIMESTAMP);
