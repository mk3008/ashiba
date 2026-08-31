-- name: ListByIdAsc :many
SELECT id, title, status, assignee, priority, created_at, metadata FROM tickets
WHERE ($1::ticket_status IS NULL OR status = $1::ticket_status)
  AND ($2::text IS NULL OR assignee IS NOT DISTINCT FROM $2::text)
ORDER BY id ASC LIMIT $3 OFFSET $4;

-- name: ListByIdDesc :many
SELECT id, title, status, assignee, priority, created_at, metadata FROM tickets
WHERE ($1::ticket_status IS NULL OR status = $1::ticket_status)
  AND ($2::text IS NULL OR assignee IS NOT DISTINCT FROM $2::text)
ORDER BY id DESC LIMIT $3 OFFSET $4;

-- name: ListByPriorityAsc :many
SELECT id, title, status, assignee, priority, created_at, metadata FROM tickets
WHERE ($1::ticket_status IS NULL OR status = $1::ticket_status)
  AND ($2::text IS NULL OR assignee IS NOT DISTINCT FROM $2::text)
ORDER BY priority ASC, id ASC LIMIT $3 OFFSET $4;

-- name: ListByPriorityDesc :many
SELECT id, title, status, assignee, priority, created_at, metadata FROM tickets
WHERE ($1::ticket_status IS NULL OR status = $1::ticket_status)
  AND ($2::text IS NULL OR assignee IS NOT DISTINCT FROM $2::text)
ORDER BY priority DESC, id ASC LIMIT $3 OFFSET $4;

-- name: ListByCreatedAtAsc :many
SELECT id, title, status, assignee, priority, created_at, metadata FROM tickets
WHERE ($1::ticket_status IS NULL OR status = $1::ticket_status)
  AND ($2::text IS NULL OR assignee IS NOT DISTINCT FROM $2::text)
ORDER BY created_at ASC, id ASC LIMIT $3 OFFSET $4;

-- name: ListByCreatedAtDesc :many
SELECT id, title, status, assignee, priority, created_at, metadata FROM tickets
WHERE ($1::ticket_status IS NULL OR status = $1::ticket_status)
  AND ($2::text IS NULL OR assignee IS NOT DISTINCT FROM $2::text)
ORDER BY created_at DESC, id ASC LIMIT $3 OFFSET $4;

-- name: GetTicket :one
SELECT id, title, status, assignee, priority, created_at, metadata FROM tickets WHERE id = $1 LIMIT 1;

-- name: CreateTicket :one
INSERT INTO tickets (title, status, assignee, priority, created_at, metadata)
VALUES ($1, $2::ticket_status, $3, $4, NOW(), $5::jsonb)
RETURNING id, title, status, assignee, priority, created_at, metadata;

-- name: UpdateTicketAssignee :one
UPDATE tickets SET assignee = $2 WHERE id = $1 RETURNING id, assignee;

-- name: InsertTicketAudit :exec
INSERT INTO ticket_audit (ticket_id, action, detail, created_at) VALUES ($1, 'assigned', $2, NOW());
