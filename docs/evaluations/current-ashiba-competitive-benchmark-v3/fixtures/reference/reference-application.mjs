import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { quoteSchema } from '../fixture.mjs';

const { Client } = pg;
const HERE = dirname(fileURLToPath(import.meta.url));
const Q1_TEMPLATE = await readFile(join(HERE, '..', 'q1.sql'), 'utf8');

function runtimeParts(runtime) {
  if (!runtime?.connectionString || !runtime?.schema) throw new Error('runtime connectionString and schema are required');
  return { connectionString: runtime.connectionString, s: quoteSchema(runtime.schema), auditFailure: runtime.auditFailure === true };
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

function positiveAmount(value) {
  const amount = BigInt(String(value));
  if (amount <= 0n) throw new Error('amountCents must be positive');
  return amount.toString();
}

export function createApplication(runtime) {
  runtimeParts(runtime);
  return {
    async list(input = {}) {
      const { s } = runtimeParts(runtime);
      const sortColumns = { id: 'id', priority: 'priority', createdAt: 'created_at' };
      const sort = sortColumns[input.sort ?? 'id'];
      const direction = input.direction === 'desc' ? 'DESC' : 'ASC';
      if (!sort) throw new Error('unsupported sort');
      const where = [];
      const params = [];
      if (input.status !== undefined) { params.push(String(input.status)); where.push(`status = $${params.length}::${s}.ticket_status`); }
      if (input.assignee !== undefined) { params.push(input.assignee); where.push(`assignee IS NOT DISTINCT FROM $${params.length}`); }
      params.push(Math.max(0, Number(input.limit ?? 10)), Math.max(0, Number(input.offset ?? 0)));
      const result = await useClient(runtime, (client) => client.query(
        `SELECT id::text AS id, title, status::text AS status, assignee, priority, created_at, metadata FROM ${s}.tickets ${where.length ? `WHERE ${where.join(' AND ')}` : ''} ORDER BY ${sort} ${direction}, id ASC LIMIT $${params.length - 1} OFFSET $${params.length}`,
        params,
      ));
      return result.rows;
    },

    async get(input) {
      const { s } = runtimeParts(runtime);
      const result = await useClient(runtime, (client) => client.query(
        `SELECT id::text AS id, title, status::text AS status, assignee, priority, created_at, metadata FROM ${s}.tickets WHERE id = $1`,
        [String(input?.id)],
      ));
      return result.rows[0] ?? null;
    },

    async create(input) {
      const { s } = runtimeParts(runtime);
      const result = await useClient(runtime, (client) => client.query(
        `INSERT INTO ${s}.tickets(title, status, assignee, priority, created_at, metadata) VALUES ($1, $2::${s}.ticket_status, $3, $4, TIMESTAMPTZ '2026-03-01 00:00:00+00', $5::jsonb) RETURNING id::text AS id, title, status::text AS status, assignee, priority`,
        [String(input.title), String(input.status ?? 'open'), input.assignee ?? null, Number(input.priority ?? 1), JSON.stringify(input.metadata ?? {})],
      ));
      return result.rows[0];
    },

    async assign(input) {
      const { s, auditFailure } = runtimeParts(runtime);
      return useClient(runtime, async (client) => {
        await client.query('BEGIN');
        try {
          const update = await client.query(`UPDATE ${s}.tickets SET assignee = $1 WHERE id = $2 RETURNING id::text AS id`, [input.assignee ?? null, String(input.id)]);
          if (!update.rows.length) throw new Error('ticket not found');
          await client.query(`INSERT INTO ${s}.ticket_audit(ticket_id, action, detail, created_at) VALUES ($1, 'assign', $2, TIMESTAMPTZ '2026-03-01 00:00:00+00')`, [String(input.id), String(input.assignee ?? '')]);
          if (auditFailure) throw new Error('forced audit failure');
          await client.query('COMMIT');
          return { id: update.rows[0].id, assignee: input.assignee ?? null };
        } catch (error) {
          await client.query('ROLLBACK').catch(() => undefined);
          throw error;
        }
      });
    },

    async transfer(input) {
      const { s } = runtimeParts(runtime);
      const from = String(input.fromAccountId), to = String(input.toAccountId), amount = positiveAmount(input.amountCents);
      if (from === to) throw new Error('source and target must differ');
      return useClient(runtime, async (client) => {
        await client.query('BEGIN');
        try {
          const locked = await client.query(`SELECT account_id::text AS account_id, balance_cents::text AS balance_cents FROM ${s}.accounts WHERE account_id IN ($1, $2) ORDER BY account_id FOR UPDATE`, [from, to]);
          const source = locked.rows.find((row) => row.account_id === from), target = locked.rows.find((row) => row.account_id === to);
          if (!source || !target || BigInt(source.balance_cents) < BigInt(amount)) throw new Error('insufficient funds');
          await client.query(`UPDATE ${s}.accounts SET balance_cents = balance_cents - $1 WHERE account_id = $2`, [amount, from]);
          if (input.failAfterDebit === true) throw new Error('forced failure after debit');
          await client.query(`UPDATE ${s}.accounts SET balance_cents = balance_cents + $1 WHERE account_id = $2`, [amount, to]);
          await client.query(`INSERT INTO ${s}.transfer_audit(from_account_id, to_account_id, amount_cents, note) VALUES ($1, $2, $3, $4)`, [from, to, amount, String(input.note ?? '')]);
          await client.query('COMMIT');
          return { status: 'ok', applied: true };
        } catch (error) {
          await client.query('ROLLBACK').catch(() => undefined);
          throw error;
        }
      });
    },

    async claim(input) {
      const { s } = runtimeParts(runtime);
      const worker = String(input?.workerId ?? input?.worker ?? 'worker');
      return useClient(runtime, async (client) => {
        await client.query('BEGIN');
        try {
          const selected = await client.query(`SELECT id::text AS id FROM ${s}.work_items WHERE state = 'queued' ORDER BY id FOR UPDATE SKIP LOCKED LIMIT 1`);
          if (!selected.rows.length) { await client.query('ROLLBACK'); return { claimedWorkId: null }; }
          const id = selected.rows[0].id;
          await client.query(`UPDATE ${s}.work_items SET state = 'claimed', claimed_by = $1 WHERE id = $2`, [worker, id]);
          if (input.failAfterClaim === true) throw new Error('forced claim rollback');
          await client.query('COMMIT');
          return { claimedWorkId: id };
        } catch (error) {
          await client.query('ROLLBACK').catch(() => undefined);
          throw error;
        }
      });
    },

    async investigate(input) {
      const { s } = runtimeParts(runtime);
      const query = String(input?.query ?? '').replaceAll('__SCHEMA__', s);
      const params = Array.isArray(input?.params) ? input.params : [];
      if (!query.trim()) throw new Error('investigate query is required');
      const result = await useClient(runtime, (client) => client.query(query, params));
      return { rows: result.rows, sourceSql: query, executedSql: query, params };
    },
  };
}

export { Q1_TEMPLATE };
