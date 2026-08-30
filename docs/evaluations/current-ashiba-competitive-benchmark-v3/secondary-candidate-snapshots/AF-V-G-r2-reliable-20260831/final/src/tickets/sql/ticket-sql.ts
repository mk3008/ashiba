export type TicketSort = 'id' | 'priority' | 'createdAt';
export type SortDirection = 'asc' | 'desc';

const ORDER_BY: Record<TicketSort, Record<SortDirection, string>> = {
  id: { asc: 'id ASC', desc: 'id DESC' },
  priority: { asc: 'priority ASC', desc: 'priority DESC' },
  createdAt: { asc: 'created_at ASC', desc: 'created_at DESC' },
};

const COLUMNS = `
  id::text AS id,
  title,
  status::text AS status,
  assignee,
  priority,
  created_at AS "createdAt",
  metadata
`;

export function listTicketsSql(sort: TicketSort, direction: SortDirection): string {
  return `SELECT ${COLUMNS}
    FROM tickets
    WHERE ($1::text IS NULL OR status::text = $1::text)
      AND (NOT $2::boolean OR assignee IS NOT DISTINCT FROM $3::text)
    ORDER BY ${ORDER_BY[sort][direction]}, id ASC
    LIMIT $4::integer OFFSET $5::integer`;
}

export const getTicketSql = `SELECT ${COLUMNS} FROM tickets WHERE id = $1::bigint`;

export const createTicketSql = `INSERT INTO tickets (title, status, assignee, priority, metadata, created_at)
  VALUES ($1, $2, $3, $4, $5::jsonb, NOW())
  RETURNING ${COLUMNS}`;
