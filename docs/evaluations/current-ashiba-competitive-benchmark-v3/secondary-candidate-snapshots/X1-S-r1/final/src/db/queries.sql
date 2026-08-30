-- name: Report :many
WITH grouped_report AS (
  SELECT
    CASE WHEN sqlc.arg(include_status)::boolean THEN t.status::text ELSE NULL::text END AS status,
    CASE WHEN sqlc.arg(include_assignee)::boolean THEN t.assignee ELSE NULL::text END AS assignee,
    CASE WHEN sqlc.arg(include_tag)::boolean THEN tt.tag ELSE NULL::text END AS tag,
    CASE
      WHEN sqlc.arg(metric_priority_total)::boolean THEN COALESCE(SUM(t.priority), 0)::bigint
      ELSE COUNT(*)::bigint
    END AS metric
  FROM tickets AS t
  LEFT JOIN ticket_tags AS tt
    ON sqlc.arg(include_tag_join)::boolean AND tt.ticket_id = t.id
  WHERE (sqlc.arg(statuses)::ticket_status[] IS NULL OR t.status = ANY(sqlc.arg(statuses)::ticket_status[]))
    AND (sqlc.arg(requested_tag)::text IS NULL OR tt.tag = sqlc.arg(requested_tag)::text)
  GROUP BY
    CASE WHEN sqlc.arg(include_status)::boolean THEN t.status::text ELSE NULL::text END,
    CASE WHEN sqlc.arg(include_assignee)::boolean THEN t.assignee ELSE NULL::text END,
    CASE WHEN sqlc.arg(include_tag)::boolean THEN tt.tag ELSE NULL::text END
)
SELECT status, assignee, tag, metric
FROM grouped_report
ORDER BY
  CASE sqlc.arg(sort_first)::text
    WHEN 'status' THEN status
    WHEN 'assignee' THEN assignee
    WHEN 'tag' THEN tag
    ELSE NULL::text
  END ASC NULLS LAST,
  CASE sqlc.arg(sort_second)::text
    WHEN 'status' THEN status
    WHEN 'assignee' THEN assignee
    WHEN 'tag' THEN tag
    ELSE NULL::text
  END ASC NULLS LAST,
  CASE sqlc.arg(sort_third)::text
    WHEN 'status' THEN status
    WHEN 'assignee' THEN assignee
    WHEN 'tag' THEN tag
    ELSE NULL::text
  END ASC NULLS LAST;
