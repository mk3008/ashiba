import { bindNamedParameters } from '@ashiba-ts/named-parameters';
import { bindingMetadata as listCreatedAtAsc } from '../generated/list-createdAt-asc.mjs';
import { bindingMetadata as listCreatedAtDesc } from '../generated/list-createdAt-desc.mjs';
import { bindingMetadata as listSubjectAsc } from '../generated/list-subject-asc.mjs';
import { bindingMetadata as listSubjectDesc } from '../generated/list-subject-desc.mjs';
import { bindingMetadata as getTicket } from '../generated/get.mjs';
import { bindingMetadata as assignTicket } from '../generated/assign.mjs';
import { bindingMetadata as auditTicket } from '../generated/audit.mjs';

const sortBindings = Object.freeze({
  'createdAt:asc': listCreatedAtAsc,
  'createdAt:desc': listCreatedAtDesc,
  'subject:asc': listSubjectAsc,
  'subject:desc': listSubjectDesc,
});

function queryBound(client, binding, parameters) {
  const { sql, values } = bindNamedParameters(binding.bindings.postgres, parameters);
  return client.query(sql, values);
}

export function listTickets(client, { status = null, assigneeId = null, limit = 50, offset = 0, sortKey = 'createdAt', sortDirection = 'desc' } = {}) {
  if (!Number.isInteger(limit) || limit < 0 || !Number.isInteger(offset) || offset < 0) throw new TypeError('limit and offset must be non-negative integers');
  const statement = sortBindings[`${sortKey}:${sortDirection}`];
  if (!statement) throw new RangeError('sortKey must be createdAt or subject and sortDirection must be asc or desc');
  return queryBound(client, statement, { status, assigneeId, limit, offset });
}

export function getTicketById(client, ticketId) {
  return queryBound(client, getTicket, { ticketId });
}

export async function assignTicketWithAudit(pool, ticketId, assigneeId, { auditKind = 'assigned', auditFailure = false } = {}) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const update = await queryBound(client, assignTicket, { ticketId, assigneeId });
    if (update.rowCount !== 1) throw new Error('ticket not found');
    await queryBound(client, auditTicket, { ticketId, kind: auditKind });
    if (auditFailure) throw new Error('injected audit failure');
    await client.query('COMMIT');
    return update.rows[0];
  } catch (error) {
    try { await client.query('ROLLBACK'); } catch { /* preserve original failure */ }
    throw error;
  } finally {
    client.release();
  }
}
