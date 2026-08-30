-- name: ListStatusCounts :many
SELECT status::text AS "status", COUNT(*)::int AS "metric"
FROM tickets
GROUP BY status
ORDER BY status ASC NULLS LAST;

-- name: ListStatusAssigneePriority :many
SELECT status::text AS "status", assignee AS "assignee", COALESCE(SUM(priority), 0)::int AS "metric"
FROM tickets
WHERE status::text = ANY(sqlc.arg(statuses)::text[])
GROUP BY status, assignee
ORDER BY status ASC NULLS LAST, assignee ASC NULLS LAST;

-- name: ListTagStatusCount :many
SELECT tt.tag AS "tag", t.status::text AS "status", COUNT(*)::int AS "metric"
FROM tickets t
JOIN ticket_tags tt ON tt.ticket_id = t.id
WHERE tt.tag = sqlc.arg(requested_tag)
GROUP BY tt.tag, t.status
ORDER BY tt.tag ASC NULLS LAST, t.status ASC NULLS LAST;
