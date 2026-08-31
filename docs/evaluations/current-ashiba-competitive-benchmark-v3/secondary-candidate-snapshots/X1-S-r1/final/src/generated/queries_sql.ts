import { QueryArrayConfig, QueryArrayResult } from "pg";

interface Client {
    query: (config: QueryArrayConfig) => Promise<QueryArrayResult>;
}

export const reportQuery = `-- name: Report :many
WITH grouped_report AS (
  SELECT
    CASE WHEN $4::boolean THEN t.status::text ELSE NULL::text END AS status,
    CASE WHEN $5::boolean THEN t.assignee ELSE NULL::text END AS assignee,
    CASE WHEN $6::boolean THEN tt.tag ELSE NULL::text END AS tag,
    CASE
      WHEN $7::boolean THEN COALESCE(SUM(t.priority), 0)::bigint
      ELSE COUNT(*)::bigint
    END AS metric
  FROM tickets AS t
  LEFT JOIN ticket_tags AS tt
    ON $8::boolean AND tt.ticket_id = t.id
  WHERE ($9::ticket_status[] IS NULL OR t.status = ANY($9::ticket_status[]))
    AND ($10::text IS NULL OR tt.tag = $10::text)
  GROUP BY
    CASE WHEN $4::boolean THEN t.status::text ELSE NULL::text END,
    CASE WHEN $5::boolean THEN t.assignee ELSE NULL::text END,
    CASE WHEN $6::boolean THEN tt.tag ELSE NULL::text END
)
SELECT status, assignee, tag, metric
FROM grouped_report
ORDER BY
  CASE $1::text
    WHEN 'status' THEN status
    WHEN 'assignee' THEN assignee
    WHEN 'tag' THEN tag
    ELSE NULL::text
  END ASC NULLS LAST,
  CASE $2::text
    WHEN 'status' THEN status
    WHEN 'assignee' THEN assignee
    WHEN 'tag' THEN tag
    ELSE NULL::text
  END ASC NULLS LAST,
  CASE $3::text
    WHEN 'status' THEN status
    WHEN 'assignee' THEN assignee
    WHEN 'tag' THEN tag
    ELSE NULL::text
  END ASC NULLS LAST`;

export interface ReportArgs {
    sortFirst: string;
    sortSecond: string;
    sortThird: string;
    includeStatus: boolean;
    includeAssignee: boolean;
    includeTag: boolean;
    metricPriorityTotal: boolean;
    includeTagJoin: boolean;
    statuses: string[];
    requestedTag: string;
}

export interface ReportRow {
    status: string;
    assignee: string;
    tag: string;
    metric: string;
}

export async function report(client: Client, args: ReportArgs): Promise<ReportRow[]> {
    const result = await client.query({
        text: reportQuery,
        values: [args.sortFirst, args.sortSecond, args.sortThird, args.includeStatus, args.includeAssignee, args.includeTag, args.metricPriorityTotal, args.includeTagJoin, args.statuses, args.requestedTag],
        rowMode: "array"
    });
    return result.rows.map(row => {
        return {
            status: row[0],
            assignee: row[1],
            tag: row[2],
            metric: row[3]
        };
    });
}

