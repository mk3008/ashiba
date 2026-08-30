import { QueryArrayConfig, QueryArrayResult } from "pg";

interface Client {
    query: (config: QueryArrayConfig) => Promise<QueryArrayResult>;
}

export const listStatusCountsQuery = `-- name: ListStatusCounts :many
SELECT status::text AS "status", COUNT(*)::int AS "metric"
FROM tickets
GROUP BY status
ORDER BY status ASC NULLS LAST`;

export interface ListStatusCountsRow {
    status: string;
    metric: number;
}

export async function listStatusCounts(client: Client): Promise<ListStatusCountsRow[]> {
    const result = await client.query({
        text: listStatusCountsQuery,
        values: [],
        rowMode: "array"
    });
    return result.rows.map(row => {
        return {
            status: row[0],
            metric: row[1]
        };
    });
}

export const listStatusAssigneePriorityQuery = `-- name: ListStatusAssigneePriority :many
SELECT status::text AS "status", assignee AS "assignee", COALESCE(SUM(priority), 0)::int AS "metric"
FROM tickets
WHERE status::text = ANY($1::text[])
GROUP BY status, assignee
ORDER BY status ASC NULLS LAST, assignee ASC NULLS LAST`;

export interface ListStatusAssigneePriorityArgs {
    statuses: string[];
}

export interface ListStatusAssigneePriorityRow {
    status: string;
    assignee: string | null;
    metric: number;
}

export async function listStatusAssigneePriority(client: Client, args: ListStatusAssigneePriorityArgs): Promise<ListStatusAssigneePriorityRow[]> {
    const result = await client.query({
        text: listStatusAssigneePriorityQuery,
        values: [args.statuses],
        rowMode: "array"
    });
    return result.rows.map(row => {
        return {
            status: row[0],
            assignee: row[1],
            metric: row[2]
        };
    });
}

export const listTagStatusCountQuery = `-- name: ListTagStatusCount :many
SELECT tt.tag AS "tag", t.status::text AS "status", COUNT(*)::int AS "metric"
FROM tickets t
JOIN ticket_tags tt ON tt.ticket_id = t.id
WHERE tt.tag = $1
GROUP BY tt.tag, t.status
ORDER BY tt.tag ASC NULLS LAST, t.status ASC NULLS LAST`;

export interface ListTagStatusCountArgs {
    requestedTag: string;
}

export interface ListTagStatusCountRow {
    tag: string;
    status: string;
    metric: number;
}

export async function listTagStatusCount(client: Client, args: ListTagStatusCountArgs): Promise<ListTagStatusCountRow[]> {
    const result = await client.query({
        text: listTagStatusCountQuery,
        values: [args.requestedTag],
        rowMode: "array"
    });
    return result.rows.map(row => {
        return {
            tag: row[0],
            status: row[1],
            metric: row[2]
        };
    });
}

