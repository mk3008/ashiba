/** Feature-local query seam. Canonical SQL remains reviewable in this ticket slice. */
export const ticketReadModelBoundary = 'feature-local';

export type TicketSort = 'id' | 'priority' | 'createdAt';
export type SortDirection = 'asc' | 'desc';

const listWhere = `
  FROM tickets
  WHERE (:status IS NULL OR status = :status::ticket_status)
    AND (:hasAssigneeFilter = false OR assignee IS NOT DISTINCT FROM :assignee)
`;

/** A closed finite mapping is the only SQL-syntax selection in this feature. */
export const listTicketsSql: Record<TicketSort, Record<SortDirection, string>> = {
  id: {
    asc: `SELECT id::text AS id, title, status::text AS status, assignee, priority, created_at AS "createdAt", metadata${listWhere}ORDER BY tickets.id ASC, tickets.id ASC OFFSET :offset LIMIT :limit`,
    desc: `SELECT id::text AS id, title, status::text AS status, assignee, priority, created_at AS "createdAt", metadata${listWhere}ORDER BY tickets.id DESC, tickets.id ASC OFFSET :offset LIMIT :limit`,
  },
  priority: {
    asc: `SELECT id::text AS id, title, status::text AS status, assignee, priority, created_at AS "createdAt", metadata${listWhere}ORDER BY tickets.priority ASC, tickets.id ASC OFFSET :offset LIMIT :limit`,
    desc: `SELECT id::text AS id, title, status::text AS status, assignee, priority, created_at AS "createdAt", metadata${listWhere}ORDER BY tickets.priority DESC, tickets.id ASC OFFSET :offset LIMIT :limit`,
  },
  createdAt: {
    asc: `SELECT id::text AS id, title, status::text AS status, assignee, priority, created_at AS "createdAt", metadata${listWhere}ORDER BY tickets.created_at ASC, tickets.id ASC OFFSET :offset LIMIT :limit`,
    desc: `SELECT id::text AS id, title, status::text AS status, assignee, priority, created_at AS "createdAt", metadata${listWhere}ORDER BY tickets.created_at DESC, tickets.id ASC OFFSET :offset LIMIT :limit`,
  },
};

export const getTicketSql = `
  SELECT id::text AS id, title, status::text AS status, assignee, priority,
         created_at AS "createdAt", metadata
  FROM tickets
  WHERE id = :id::bigint
`;

export const createTicketSql = `
  INSERT INTO tickets (title, status, assignee, priority, created_at, metadata)
  VALUES (:title, :status::ticket_status, :assignee, :priority, CURRENT_TIMESTAMP, :metadata::jsonb)
  RETURNING id::text AS id, title, status::text AS status, assignee, priority,
            created_at AS "createdAt", metadata
`;

export const assignTicketSql = `
  UPDATE tickets
  SET assignee = :assignee
  WHERE id = :id::bigint
  RETURNING id::text AS id, assignee
`;

export const insertAssignmentAuditSql = `
  INSERT INTO ticket_audit (ticket_id, action, detail, created_at)
  VALUES (:id::bigint, 'assigned', :detail, CURRENT_TIMESTAMP)
`;
