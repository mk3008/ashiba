import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { lowerNamed } from '../named-lowering.mjs';

const root = path.dirname(fileURLToPath(import.meta.url));
const sql = async (name) => readFile(path.join(root, '..', 'sql', `${name}.sql`), 'utf8');
const triState = (value) => value === undefined
  ? { supplied: false, isNull: false, value: null }
  : value === null ? { supplied: true, isNull: true, value: null } : { supplied: true, isNull: false, value };

export async function createReferenceApp(pool) {
  const assets = Object.fromEntries(await Promise.all([
    'get-work-item', 'search-work-items', 'create-work-item', 'update-work-item',
    'claim-next-work-item', 'mark-work-item-claimed', 'insert-claim-audit',
    ...['created-at', 'summary', 'priority'].flatMap((key) => [`list-${key}-asc`, `list-${key}-desc`]),
  ].map(async (name) => [name, await sql(name)])));
  const execute = async (client, asset, params = {}) => client.query(...Object.values(lowerNamed(assets[asset], params)) .slice(0, 2));
  const orderAssets = {
    createdAt: { asc: 'list-created-at-asc', desc: 'list-created-at-desc' },
    summary: { asc: 'list-summary-asc', desc: 'list-summary-desc' },
    priority: { asc: 'list-priority-asc', desc: 'list-priority-desc' },
  };
  return {
    assets,
    async getWorkItem(id) { return (await execute(pool, 'get-work-item', { id })).rows[0] ?? null; },
    async search(input = {}) {
      const assignee = triState(input.assignee); const customer = triState(input.customerId);
      return (await execute(pool, 'search-work-items', {
        assignee_supplied: assignee.supplied, assignee_is_null: assignee.isNull, assignee: assignee.value,
        customer_id_supplied: customer.supplied, customer_id_is_null: customer.isNull, customer_id: customer.value,
      })).rows;
    },
    async list({ sort, direction, limit = 20, offset = 0 }) {
      const asset = orderAssets[sort]?.[direction];
      if (!asset) throw new Error('Unsupported ordering capability');
      if (!Number.isInteger(limit) || limit < 1 || limit > 50 || !Number.isInteger(offset) || offset < 0) throw new Error('Invalid pagination');
      return (await execute(pool, asset, { limit, offset })).rows;
    },
    async create(input) { return (await execute(pool, 'create-work-item', input)).rows[0]; },
    async update(input) { return (await execute(pool, 'update-work-item', input)).rows[0] ?? null; },
    async claimNext(claimant, context) {
      const client = await pool.connect();
      try {
        await client.query('begin');
        const next = (await execute(client, 'claim-next-work-item')).rows[0];
        if (!next) { await client.query('commit'); return null; }
        const claimed = (await execute(client, 'mark-work-item-claimed', { id: next.id, claimant })).rows[0];
        await execute(client, 'insert-claim-audit', { work_item_id: next.id, claimant, context: JSON.stringify(context) });
        await client.query('commit'); return claimed;
      } catch (error) { await client.query('rollback'); throw error; } finally { client.release(); }
    },
  };
}
