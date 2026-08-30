import { compileNamedParameters } from '@ashiba-ts/named-parameters/compiler';
import type { ParameterBinding } from '@ashiba-ts/named-parameters';

const ticketColumns = `
  id,
  title,
  status,
  assignee,
  priority,
  created_at,
  metadata
`;

const listPrefix = `
  SELECT ${ticketColumns}
  FROM tickets
  WHERE (:statusProvided::boolean = false OR status = :status::ticket_status)
    AND (:assigneeProvided::boolean = false OR assignee IS NOT DISTINCT FROM :assignee::text)
`;

/**
 * This finite mapping selects SQL syntax only. External values are named
 * parameters and are lowered by the Arm A compiler below.
 */
const listSources = {
  idAsc: `${listPrefix} ORDER BY id ASC LIMIT :limit::integer OFFSET :offset::integer`,
  idDesc: `${listPrefix} ORDER BY id DESC, id ASC LIMIT :limit::integer OFFSET :offset::integer`,
  priorityAsc: `${listPrefix} ORDER BY priority ASC, id ASC LIMIT :limit::integer OFFSET :offset::integer`,
  priorityDesc: `${listPrefix} ORDER BY priority DESC, id ASC LIMIT :limit::integer OFFSET :offset::integer`,
  createdAtAsc: `${listPrefix} ORDER BY created_at ASC, id ASC LIMIT :limit::integer OFFSET :offset::integer`,
  createdAtDesc: `${listPrefix} ORDER BY created_at DESC, id ASC LIMIT :limit::integer OFFSET :offset::integer`,
} as const;

type IndexedStatement = Extract<ParameterBinding, { style: 'indexed' }>;

export const ticketSql = {
  list: Object.fromEntries(
    Object.entries(listSources).map(([name, source]) => [name, compileNamedParameters(source)]),
  ) as unknown as Record<keyof typeof listSources, IndexedStatement>,
  get: compileNamedParameters(`SELECT ${ticketColumns} FROM tickets WHERE id = :id::bigint`),
  create: compileNamedParameters(`
    INSERT INTO tickets (title, status, assignee, priority, created_at, metadata)
    VALUES (:title::text, :status::ticket_status, :assignee::text, :priority::integer, now(), :metadata::jsonb)
    RETURNING ${ticketColumns}
  `),
  assign: compileNamedParameters(`
    UPDATE tickets
    SET assignee = :assignee::text
    WHERE id = :id::bigint
    RETURNING id, assignee
  `),
  insertAudit: compileNamedParameters(`
    INSERT INTO ticket_audit (ticket_id, action, detail, created_at)
    VALUES (:ticketId::bigint, 'assigned', :detail::text, now())
  `),
};
