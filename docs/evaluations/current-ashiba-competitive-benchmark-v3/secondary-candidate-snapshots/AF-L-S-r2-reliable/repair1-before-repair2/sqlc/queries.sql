-- name: ListTicketsByIdAsc :many
SELECT id, title, status, assignee, priority, created_at, metadata
FROM tickets
WHERE (sqlc.arg(status_filter)::text = '' OR status::text = sqlc.arg(status_filter)::text)
  AND (sqlc.arg(assignee_mode)::integer = 0
       OR (sqlc.arg(assignee_mode)::integer = 1 AND assignee IS NULL)
       OR (sqlc.arg(assignee_mode)::integer = 2 AND assignee = sqlc.arg(assignee_value)::text))
ORDER BY id ASC
LIMIT sqlc.arg(limit_count) OFFSET sqlc.arg(offset_count);

-- name: ListTicketsByIdDesc :many
SELECT id, title, status, assignee, priority, created_at, metadata
FROM tickets
WHERE (sqlc.arg(status_filter)::text = '' OR status::text = sqlc.arg(status_filter)::text)
  AND (sqlc.arg(assignee_mode)::integer = 0
       OR (sqlc.arg(assignee_mode)::integer = 1 AND assignee IS NULL)
       OR (sqlc.arg(assignee_mode)::integer = 2 AND assignee = sqlc.arg(assignee_value)::text))
ORDER BY id DESC
LIMIT sqlc.arg(limit_count) OFFSET sqlc.arg(offset_count);

-- name: ListTicketsByPriorityAsc :many
SELECT id, title, status, assignee, priority, created_at, metadata
FROM tickets
WHERE (sqlc.arg(status_filter)::text = '' OR status::text = sqlc.arg(status_filter)::text)
  AND (sqlc.arg(assignee_mode)::integer = 0
       OR (sqlc.arg(assignee_mode)::integer = 1 AND assignee IS NULL)
       OR (sqlc.arg(assignee_mode)::integer = 2 AND assignee = sqlc.arg(assignee_value)::text))
ORDER BY priority ASC, id ASC
LIMIT sqlc.arg(limit_count) OFFSET sqlc.arg(offset_count);

-- name: ListTicketsByPriorityDesc :many
SELECT id, title, status, assignee, priority, created_at, metadata
FROM tickets
WHERE (sqlc.arg(status_filter)::text = '' OR status::text = sqlc.arg(status_filter)::text)
  AND (sqlc.arg(assignee_mode)::integer = 0
       OR (sqlc.arg(assignee_mode)::integer = 1 AND assignee IS NULL)
       OR (sqlc.arg(assignee_mode)::integer = 2 AND assignee = sqlc.arg(assignee_value)::text))
ORDER BY priority DESC, id ASC
LIMIT sqlc.arg(limit_count) OFFSET sqlc.arg(offset_count);

-- name: ListTicketsByCreatedAtAsc :many
SELECT id, title, status, assignee, priority, created_at, metadata
FROM tickets
WHERE (sqlc.arg(status_filter)::text = '' OR status::text = sqlc.arg(status_filter)::text)
  AND (sqlc.arg(assignee_mode)::integer = 0
       OR (sqlc.arg(assignee_mode)::integer = 1 AND assignee IS NULL)
       OR (sqlc.arg(assignee_mode)::integer = 2 AND assignee = sqlc.arg(assignee_value)::text))
ORDER BY created_at ASC, id ASC
LIMIT sqlc.arg(limit_count) OFFSET sqlc.arg(offset_count);

-- name: ListTicketsByCreatedAtDesc :many
SELECT id, title, status, assignee, priority, created_at, metadata
FROM tickets
WHERE (sqlc.arg(status_filter)::text = '' OR status::text = sqlc.arg(status_filter)::text)
  AND (sqlc.arg(assignee_mode)::integer = 0
       OR (sqlc.arg(assignee_mode)::integer = 1 AND assignee IS NULL)
       OR (sqlc.arg(assignee_mode)::integer = 2 AND assignee = sqlc.arg(assignee_value)::text))
ORDER BY created_at DESC, id ASC
LIMIT sqlc.arg(limit_count) OFFSET sqlc.arg(offset_count);

-- name: GetTicket :one
SELECT id, title, status, assignee, priority, created_at, metadata
FROM tickets
WHERE id = sqlc.arg(id);

-- name: CreateTicket :one
INSERT INTO tickets (title, status, assignee, priority, created_at, metadata)
VALUES (sqlc.arg(title), sqlc.arg(status)::ticket_status, sqlc.arg(assignee), sqlc.arg(priority), NOW(), sqlc.arg(metadata)::jsonb)
RETURNING id, title, status, assignee, priority, created_at, metadata;

-- name: AssignTicket :one
UPDATE tickets
SET assignee = sqlc.arg(assignee)
WHERE id = sqlc.arg(id)
RETURNING id, assignee;

-- name: InsertTicketAudit :exec
INSERT INTO ticket_audit (ticket_id, action, detail, created_at)
VALUES (sqlc.arg(ticket_id), 'assigned', sqlc.arg(detail), NOW());
