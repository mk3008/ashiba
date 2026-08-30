import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { quoteSchema } from '../fixture.mjs';

const { Client } = pg;
const HERE = dirname(fileURLToPath(import.meta.url));
const Q1_TEMPLATE = await readFile(join(HERE, '..', 'q1.sql'), 'utf8');
const TICKET_STATUSES = new Set(['open', 'pending', 'closed']);
const SORT_COLUMNS = { id: 'id', priority: 'priority', createdAt: 'created_at' };

function codedError(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}

function runtimeParts(runtime) {
  if (!runtime?.connectionString || !runtime?.schema) throw codedError('VALIDATION', 'runtime connectionString and schema are required');
  return { connectionString: runtime.connectionString, s: quoteSchema(runtime.schema) };
}

function positiveInteger(value, name) {
  if (!/^\d+$/.test(String(value)) || BigInt(String(value)) <= 0n) throw codedError('VALIDATION', `${name} must be a positive integer string`);
  return String(value);
}

function boundedInteger(value, name, min, max) {
  if (!Number.isInteger(value) || value < min || value > max) throw codedError('VALIDATION', `${name} must be an integer from ${min} through ${max}`);
  return value;
}

async function useClient(runtime, callback) {
  const { connectionString } = runtimeParts(runtime);
  const client = new Client({ connectionString });
  await client.connect();
  try {
    return await callback(client);
  } finally {
    await client.end().catch(() => undefined);
  }
}

function q1Parts(runtime, input) {
  const { s } = runtimeParts(runtime);
  if (typeof input?.requestedTag !== 'string' || typeof input?.tier !== 'string') throw codedError('VALIDATION', 'requestedTag and tier are required strings');
  const query = Q1_TEMPLATE.replaceAll('{{schema}}', s);
  return { query, params: [input.requestedTag, input.tier] };
}

export function createApplication(runtime) {
  runtimeParts(runtime);
  let closed = false;
  const ensureOpen = () => { if (closed) throw codedError('APPLICATION_CLOSED', 'application is closed'); };
  const ticketColumns = 'id::text AS id, title, status::text AS status, assignee, priority, created_at::text AS "createdAt", metadata';

  return {
    async list(input = {}) {
      ensureOpen();
      const { s } = runtimeParts(runtime);
      const sort = SORT_COLUMNS[input.sort ?? 'id'];
      if (!sort || !['asc', 'desc'].includes(input.direction ?? 'asc')) throw codedError('VALIDATION', 'unsupported sort or direction');
      if (input.status !== undefined && !TICKET_STATUSES.has(input.status)) throw codedError('VALIDATION', 'unsupported status');
      if (input.assignee !== undefined && input.assignee !== null && typeof input.assignee !== 'string') throw codedError('VALIDATION', 'assignee must be a string or null');
      const limit = boundedInteger(input.limit ?? 10, 'limit', 1, 100);
      const offset = boundedInteger(input.offset ?? 0, 'offset', 0, 10000);
      const where = [];
      const params = [];
      if (input.status !== undefined) { params.push(input.status); where.push(`status = $${params.length}::${s}.ticket_status`); }
      if (input.assignee !== undefined) { params.push(input.assignee); where.push(`assignee IS NOT DISTINCT FROM $${params.length}`); }
      params.push(limit, offset);
      return (await useClient(runtime, (client) => client.query(
        `SELECT ${ticketColumns} FROM ${s}.tickets ${where.length ? `WHERE ${where.join(' AND ')}` : ''} ORDER BY ${sort} ${(input.direction ?? 'asc').toUpperCase()}, id ASC LIMIT $${params.length - 1} OFFSET $${params.length}`,
        params,
      ))).rows;
    },

    async get(input) {
      ensureOpen();
      const { s } = runtimeParts(runtime);
      const id = positiveInteger(input?.id, 'id');
      const result = await useClient(runtime, (client) => client.query(`SELECT ${ticketColumns} FROM ${s}.tickets WHERE id = $1`, [id]));
      return result.rows[0] ?? null;
    },

    async create(input) {
      ensureOpen();
      const { s } = runtimeParts(runtime);
      if (!input || typeof input.title !== 'string' || !TICKET_STATUSES.has(input.status) || (input.assignee !== null && typeof input.assignee !== 'string')) throw codedError('VALIDATION', 'invalid ticket input');
      const priority = boundedInteger(input.priority, 'priority', 1, 5);
      const result = await useClient(runtime, (client) => client.query(
        `INSERT INTO ${s}.tickets(title, status, assignee, priority, created_at, metadata) VALUES ($1, $2::${s}.ticket_status, $3, $4, TIMESTAMPTZ '2026-03-01 00:00:00+00', $5::jsonb) RETURNING ${ticketColumns}`,
        [input.title, input.status, input.assignee, priority, JSON.stringify(input.metadata ?? {})],
      ));
      return result.rows[0];
    },

    async assign(input) {
      ensureOpen();
      const { s } = runtimeParts(runtime);
      const id = positiveInteger(input?.id, 'id');
      if (input.assignee !== null && typeof input.assignee !== 'string') throw codedError('VALIDATION', 'assignee must be a string or null');
      return useClient(runtime, async (client) => {
        await client.query('BEGIN');
        try {
          const update = await client.query(`UPDATE ${s}.tickets SET assignee = $1 WHERE id = $2 RETURNING id::text AS id`, [input.assignee, id]);
          if (!update.rows.length) throw codedError('NOT_FOUND', 'ticket not found');
          await client.query(`INSERT INTO ${s}.ticket_audit(ticket_id, action, detail, created_at) VALUES ($1, 'assign', $2, TIMESTAMPTZ '2026-03-01 00:00:00+00')`, [id, input.assignee ?? '']);
          await client.query('COMMIT');
          return { id: update.rows[0].id, assignee: input.assignee };
        } catch (error) {
          await client.query('ROLLBACK').catch(() => undefined);
          throw error;
        }
      });
    },

    async transfer(input) {
      ensureOpen();
      const { s } = runtimeParts(runtime);
      const from = positiveInteger(input?.fromAccountId, 'fromAccountId');
      const to = positiveInteger(input?.toAccountId, 'toAccountId');
      const amount = positiveInteger(input?.amountCents, 'amountCents');
      if (from === to || typeof input?.note !== 'string') throw codedError('VALIDATION', 'source, target, and note are invalid');
      return useClient(runtime, async (client) => {
        await client.query('BEGIN');
        try {
          const locked = await client.query(`SELECT account_id::text AS account_id, balance_cents::text AS balance_cents FROM ${s}.accounts WHERE account_id IN ($1, $2) ORDER BY account_id FOR UPDATE`, [from, to]);
          const source = locked.rows.find((row) => row.account_id === from);
          const target = locked.rows.find((row) => row.account_id === to);
          if (!source || !target || BigInt(source.balance_cents) < BigInt(amount)) throw codedError('INSUFFICIENT_FUNDS', 'insufficient funds');
          await client.query(`UPDATE ${s}.accounts SET balance_cents = balance_cents - $1 WHERE account_id = $2`, [amount, from]);
          await client.query(`UPDATE ${s}.accounts SET balance_cents = balance_cents + $1 WHERE account_id = $2`, [amount, to]);
          await client.query(`INSERT INTO ${s}.transfer_audit(from_account_id, to_account_id, amount_cents, note) VALUES ($1, $2, $3, $4)`, [from, to, amount, input.note]);
          await client.query('COMMIT');
          return { status: 'ok', applied: true };
        } catch (error) {
          await client.query('ROLLBACK').catch(() => undefined);
          throw error;
        }
      });
    },

    async claim(input) {
      ensureOpen();
      const { s } = runtimeParts(runtime);
      if (typeof input?.workerId !== 'string' || !input.workerId) throw codedError('VALIDATION', 'workerId is required');
      return useClient(runtime, async (client) => {
        await client.query('BEGIN');
        try {
          const selected = await client.query(`SELECT id::text AS id FROM ${s}.work_items WHERE state = 'queued' ORDER BY id FOR UPDATE SKIP LOCKED LIMIT 1`);
          if (!selected.rows.length) { await client.query('ROLLBACK'); return { claimedWorkId: null }; }
          const id = selected.rows[0].id;
          await client.query(`UPDATE ${s}.work_items SET state = 'claimed', claimed_by = $1 WHERE id = $2`, [input.workerId, id]);
          await client.query('COMMIT');
          return { claimedWorkId: id };
        } catch (error) {
          await client.query('ROLLBACK').catch(() => undefined);
          throw error;
        }
      });
    },

    async investigate(input) {
      ensureOpen();
      const { query, params } = q1Parts(runtime, input);
      const result = await useClient(runtime, (client) => client.query(query, params));
      return { rows: result.rows, sourceSql: query, executedSql: query, params };
    },

    async explain(input) {
      ensureOpen();
      const { query, params } = q1Parts(runtime, input);
      const result = await useClient(runtime, (client) => client.query(`EXPLAIN (FORMAT JSON) ${query}`, params));
      return { sourceSql: query, executedSql: query, params, plan: result.rows[0]?.['QUERY PLAN'] ?? null };
    },

    async close() {
      closed = true;
    },
  };
}

export { Q1_TEMPLATE };
