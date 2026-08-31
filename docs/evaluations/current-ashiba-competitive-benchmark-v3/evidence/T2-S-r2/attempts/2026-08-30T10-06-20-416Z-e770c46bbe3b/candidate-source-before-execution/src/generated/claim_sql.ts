import { QueryArrayConfig, QueryArrayResult } from "pg";

interface Client {
    query: (config: QueryArrayConfig) => Promise<QueryArrayResult>;
}

export const claimQueuedWorkQuery = `-- name: ClaimQueuedWork :one
WITH next_item AS (
  SELECT id
  FROM work_items
  WHERE state = 'queued'
  ORDER BY id ASC
  FOR UPDATE SKIP LOCKED
  LIMIT 1
)
UPDATE work_items AS item
SET state = 'claimed', claimed_by = $1
FROM next_item
WHERE item.id = next_item.id
RETURNING item.id`;

export interface ClaimQueuedWorkArgs {
    claimedBy: string | null;
}

export interface ClaimQueuedWorkRow {
    id: string;
}

export async function claimQueuedWork(client: Client, args: ClaimQueuedWorkArgs): Promise<ClaimQueuedWorkRow | null> {
    const result = await client.query({
        text: claimQueuedWorkQuery,
        values: [args.claimedBy],
        rowMode: "array"
    });
    if (result.rows.length !== 1) {
        return null;
    }
    const row = result.rows[0];
    return {
        id: row[0]
    };
}

