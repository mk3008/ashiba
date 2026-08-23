import { randomUUID } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import pg from 'pg';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const url = process.env.ASHIBA_EVALUATION_DATABASE_URL;
if (!url) throw new Error('ASHIBA_EVALUATION_DATABASE_URL is required');
const schema = `runtime_eval_${randomUUID().replaceAll('-', '')}`;
const client = new pg.Client({ connectionString: url });
const order = { createdAt: 'created_at', name: 'name', priority: "CASE WHEN priority = 'urgent' THEN 1 WHEN priority = 'normal' THEN 2 ELSE 3 END" };
function composeSort(input) {
  if (!Array.isArray(input) || input.length < 1 || input.length > 3) throw new Error('invalid sort length');
  const seen = new Set(); const parts = input.map(({ key, direction }) => {
    if (!order[key] || !['asc', 'desc'].includes(direction) || seen.has(key)) throw new Error('invalid sort item');
    seen.add(key); return `${order[key]} ${direction.toUpperCase()}`;
  });
  return `${parts.join(', ')}, id ASC`;
}
await client.connect();
try {
  await client.query(`create schema ${schema}; set search_path to ${schema}`);
  await client.query(`create table items (id bigint primary key, customer_id bigint, assignee text, status text, category text, priority text not null, created_at timestamptz not null, name text not null)`);
  await client.query(`insert into items select i, case when i % 100 = 0 then 999 else i % 1000 end, case when i % 10 = 0 then null else 'a' || (i % 50) end, case when i % 100 = 0 then 'rare' else 'open' end, case when i % 20 = 0 then null else 'c' || (i % 10) end, case when i % 20 = 0 then 'urgent' when i % 3 = 0 then 'normal' else 'low' end, now() - (i || ' seconds')::interval, 'item-' || i from generate_series(1, 200000) i`);
  await client.query('create index items_customer_idx on items(customer_id); create index items_status_idx on items(status); create index items_assignee_idx on items(assignee); analyze items');
  const explain = async (sql, values) => (await client.query(`explain (analyze, buffers, format json) ${sql}`, values)).rows[0]['QUERY PLAN'][0];
  const o1 = 'select id from items where ($1::boolean = false or ($2::boolean and customer_id is null) or (not $2::boolean and customer_id = $3::bigint)) and ($4::boolean = false or ($5::boolean and status is null) or (not $5::boolean and status = $6::text)) order by created_at desc, id asc limit $7::integer';
  const o2 = 'select id from items where customer_id = $1::bigint and status = $2::text order by created_at desc, id asc limit $3::integer';
  const modes = ['force_custom_plan', 'force_generic_plan']; const plans = {};
  for (const mode of modes) { await client.query(`set plan_cache_mode = ${mode}`); plans[mode] = { o1: await explain(o1, [true, false, 999, true, false, 'rare', 20]), o2: await explain(o2, [999, 'rare', 20]) }; }
  const triCases = [
    ['all-omitted', [false, false, null, false, false, null, 200000], 200000],
    ['customer-null', [true, true, null, false, false, null, 200000], 0],
    ['customer-rare', [true, false, 999, false, false, null, 200000], 2200],
    ['status-null', [false, false, null, true, true, null, 200000], 0],
    ['status-hot', [false, false, null, true, false, 'open', 200000], 198000],
    ['status-rare', [false, false, null, true, false, 'rare', 200000], 2000],
    ['mixed-selective', [true, false, 999, true, false, 'rare', 200000], 2000],
  ];
  const correctnessCases = [];
  for (const [name, values, expected] of triCases) { const count = Number((await client.query(`select count(*)::integer count from (${o1.replace('select id', 'select id').replace(' order by created_at desc, id asc limit $7::integer', '')}) q`, values.slice(0, 6))).rows[0].count); if (count !== expected) throw new Error(`${name}: ${count} !== ${expected}`); correctnessCases.push({ name, count }); }
  const valid = composeSort([{ key: 'priority', direction: 'asc' }, { key: 'createdAt', direction: 'desc' }, { key: 'name', direction: 'asc' }]);
  for (const bad of [[], [{ key: 'drop', direction: 'asc' }], [{ key: 'name', direction: 'up' }], [{ key: 'name', direction: 'asc' }, { key: 'name', direction: 'desc' }], Array(4).fill({ key: 'name', direction: 'asc' })]) { try { composeSort(bad); throw new Error('bad sort accepted'); } catch (e) { if (e.message === 'bad sort accepted') throw e; } }
  const result = { status: 'pass', frozenDataset: { rows: 200000, skew: 'customer=999/status=rare each 1%', indexes: ['customer_id', 'status', 'assignee'] }, correctness: { triCases, explicitNull: (await client.query('select count(*)::integer count from items where assignee is null')).rows[0].count, rare: (await client.query('select count(*)::integer count from items where status=$1', ['rare'])).rows[0].count }, sort: { composed: valid, hostileRejected: true }, plans };
  await writeFile(path.join(root, 'evidence', 'postgres-result.json'), `${JSON.stringify(result, null, 2)}\n`);
  console.log(JSON.stringify({ status: result.status, dataset: result.frozenDataset, sort: result.sort }));
} finally { await client.query(`drop schema if exists ${schema} cascade`); await client.end(); }
