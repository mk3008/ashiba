-- name: ListByIdAsc :many
SELECT id, title, status, assignee, priority, created_at, metadata FROM tickets
WHERE (sqlc.narg(status)::ticket_status IS NULL OR status = sqlc.narg(status)::ticket_status)
  AND (NOT sqlc.arg(has_assignee)::boolean OR assignee IS NOT DISTINCT FROM sqlc.narg(assignee)::text)
ORDER BY id ASC LIMIT sqlc.arg(page_limit) OFFSET sqlc.arg(page_offset);

-- name: ListByIdDesc :many
SELECT id, title, status, assignee, priority, created_at, metadata FROM tickets
WHERE (sqlc.narg(status)::ticket_status IS NULL OR status = sqlc.narg(status)::ticket_status)
  AND (NOT sqlc.arg(has_assignee)::boolean OR assignee IS NOT DISTINCT FROM sqlc.narg(assignee)::text)
ORDER BY id DESC LIMIT sqlc.arg(page_limit) OFFSET sqlc.arg(page_offset);

-- name: ListByPriorityAsc :many
SELECT id, title, status, assignee, priority, created_at, metadata FROM tickets
WHERE (sqlc.narg(status)::ticket_status IS NULL OR status = sqlc.narg(status)::ticket_status)
  AND (NOT sqlc.arg(has_assignee)::boolean OR assignee IS NOT DISTINCT FROM sqlc.narg(assignee)::text)
ORDER BY priority ASC, id ASC LIMIT sqlc.arg(page_limit) OFFSET sqlc.arg(page_offset);

-- name: ListByPriorityDesc :many
SELECT id, title, status, assignee, priority, created_at, metadata FROM tickets
WHERE (sqlc.narg(status)::ticket_status IS NULL OR status = sqlc.narg(status)::ticket_status)
  AND (NOT sqlc.arg(has_assignee)::boolean OR assignee IS NOT DISTINCT FROM sqlc.narg(assignee)::text)
ORDER BY priority DESC, id ASC LIMIT sqlc.arg(page_limit) OFFSET sqlc.arg(page_offset);

-- name: ListByCreatedAtAsc :many
SELECT id, title, status, assignee, priority, created_at, metadata FROM tickets
WHERE (sqlc.narg(status)::ticket_status IS NULL OR status = sqlc.narg(status)::ticket_status)
  AND (NOT sqlc.arg(has_assignee)::boolean OR assignee IS NOT DISTINCT FROM sqlc.narg(assignee)::text)
ORDER BY created_at ASC, id ASC LIMIT sqlc.arg(page_limit) OFFSET sqlc.arg(page_offset);

-- name: ListByCreatedAtDesc :many
SELECT id, title, status, assignee, priority, created_at, metadata FROM tickets
WHERE (sqlc.narg(status)::ticket_status IS NULL OR status = sqlc.narg(status)::ticket_status)
  AND (NOT sqlc.arg(has_assignee)::boolean OR assignee IS NOT DISTINCT FROM sqlc.narg(assignee)::text)
ORDER BY created_at DESC, id ASC LIMIT sqlc.arg(page_limit) OFFSET sqlc.arg(page_offset);

-- name: GetTicket :one
SELECT id, title, status, assignee, priority, created_at, metadata FROM tickets WHERE id = $1 LIMIT 1;

-- name: CreateTicket :one
INSERT INTO tickets (title, status, assignee, priority, created_at, metadata)
VALUES (sqlc.arg(title), sqlc.arg(status)::ticket_status, sqlc.narg(assignee), sqlc.arg(priority), NOW(), sqlc.arg(metadata)::jsonb)
RETURNING id, title, status, assignee, priority, created_at, metadata;

-- name: UpdateTicketAssignee :one
UPDATE tickets SET assignee = $2 WHERE id = $1 RETURNING id, assignee;

-- name: InsertTicketAudit :exec
INSERT INTO ticket_audit (ticket_id, action, detail, created_at) VALUES ($1, 'assigned', $2, NOW());
