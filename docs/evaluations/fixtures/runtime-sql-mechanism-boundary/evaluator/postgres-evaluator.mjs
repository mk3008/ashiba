import { createHash, randomUUID } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import pg from 'pg';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const url = process.env.ASHIBA_EVALUATION_DATABASE_URL;
if (!url) throw new Error('ASHIBA_EVALUATION_DATABASE_URL is required');
const schema = 'runtime_eval_' + randomUUID().replaceAll('-', '');
const client = new pg.Client({ connectionString: url });
const limit = 50;
const fields = [
  ['customerId', 'i.customer_id', 'bigint'], ['assignee', 'i.assignee', 'text'],
  ['status', 'i.status', 'text'], ['category', 'i.category', 'text'],
  ['createdAfter', 'i.created_at', 'timestamptz', '>='],
  ['createdBefore', 'i.created_at', 'timestamptz', '<'], ['priority', 'i.priority', 'text'],
];
const base = 'from items i left join customers c on c.id = i.customer_id';
const tail = 'order by i.created_at desc, i.id asc limit ' + limit;
const order = { createdAt: 'i.created_at', name: 'i.name', priority: "CASE WHEN i.priority = 'urgent' THEN 1 WHEN i.priority = 'normal' THEN 2 ELSE 3 END" };
const literal = (v) => v === null ? 'NULL' : typeof v === 'boolean' || typeof v === 'number' ? String(v) : "'" + v.replaceAll("'", "''") + "'";
const median = (values) => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];

function composeSort(input) {
  if (!Array.isArray(input) || input.length < 1 || input.length > 3) throw new Error('invalid sort length');
  const seen = new Set();
  const parts = input.map(({ key, direction }) => {
    if (!order[key] || !['asc', 'desc'].includes(direction) || seen.has(key)) throw new Error('invalid sort item');
    seen.add(key); return order[key] + ' ' + direction.toUpperCase();
  });
  return parts.join(', ') + ', i.id ASC';
}
function sortArtifact() {
  const marker = '/* ORDER_BY_INSERTION */';
  const source = 'select i.id, i.priority, i.created_at, i.name from items i where i.status = :status::text ' + marker + ' limit ' + limit;
  const generated = source.replace(':status', '$1');
  const insertionAt = generated.indexOf(marker);
  return { source, sourceHash: createHash('sha256').update(source).digest('hex'), compiledSql: generated.replace(marker, ''), insertionAt };
}
function s2Splice(source, artifact, sort) {
  if (createHash('sha256').update(source).digest('hex') !== artifact.sourceHash) throw new Error('stale sort metadata');
  return artifact.compiledSql.slice(0, artifact.insertionAt) + 'order by ' + sort + ' ' + artifact.compiledSql.slice(artifact.insertionAt);
}
function o1Sql() {
  const clauses = fields.map(([, column, type, comparator = '='], i) => {
    const p = i * 3 + 1;
    return '($' + p + '::boolean = false or ($' + (p + 1) + '::boolean and ' + column + ' is null) or (not $' + (p + 1) + '::boolean and ' + column + ' ' + comparator + ' $' + (p + 2) + '::' + type + '))';
  });
  return 'select i.id ' + base + ' where ' + clauses.join(' and ') + ' ' + tail;
}
function o2Sql(state) {
  const values = []; const clauses = [];
  for (const [name, column, type, comparator = '='] of fields) {
    const value = state[name];
    if (value === undefined) continue;
    if (value === null) clauses.push(column + ' is null');
    else { values.push(value); clauses.push(column + ' ' + comparator + ' $' + values.length + '::' + type); }
  }
  return { sql: 'select i.id ' + base + ' where ' + (clauses.length ? clauses.join(' and ') : 'true') + ' ' + tail, values };
}
function o3Sql(state) {
  const allowed = Object.keys(state).every((name) => ['customerId', 'status'].includes(name));
  if (!allowed || state.customerId === undefined || state.status === undefined || state.customerId === null || state.status === null) return null;
  return { sql: 'select i.id ' + base + ' where i.customer_id = $1::bigint and i.status = $2::text ' + tail, values: [state.customerId, state.status] };
}
function o1Values(state) {
  return fields.flatMap(([name]) => state[name] === undefined ? [false, false, null] : state[name] === null ? [true, true, null] : [true, false, state[name]]);
}
function summary(plan) {
  const top = plan.Plan; const nodes = [];
  const visit = (node) => { nodes.push(node['Node Type']); for (const child of node.Plans ?? []) visit(child); };
  visit(top);
  return { nodes, estimatedRows: top['Plan Rows'], actualRows: top['Actual Rows'], sharedHitBlocks: top['Shared Hit Blocks'], sharedReadBlocks: top['Shared Read Blocks'], planningTime: plan['Planning Time'], executionTime: plan['Execution Time'] };
}
async function measure(name, sql, values) {
  await client.query('deallocate all; prepare ' + name + ' as ' + sql);
  const args = values.map(literal).join(', '); const invocation = args ? name + '(' + args + ')' : name; const runs = [];
  for (let i = 0; i < 5; i++) {
    const response = await client.query('explain (analyze, buffers, format json) execute ' + invocation);
    runs.push(summary(response.rows[0]['QUERY PLAN'][0]));
  }
  return { first: runs[0], medianExecutionTime: median(runs.map((run) => run.executionTime)), medianPlanningTime: median(runs.map((run) => run.planningTime)), repetitions: 5 };
}

await client.connect();
try {
  await client.query('create schema ' + schema + '; set search_path to ' + schema);
  await client.query('create table customers (id bigint primary key, tier text not null)');
  await client.query("insert into customers select i, case when i = 999 then 'hot' else 'normal' end from generate_series(0, 999) i");
  await client.query('create table items (id bigint primary key, customer_id bigint, assignee text, status text, category text, priority text not null, created_at timestamptz not null, name text not null)');
  await client.query("insert into items select i, case when i % 100 = 0 then 999 else i % 1000 end, case when i % 10 = 0 then null else 'a' || (i % 50) end, case when i % 100 = 0 then 'rare' else 'open' end, case when i % 20 = 0 then null else 'c' || (i % 10) end, case when i % 20 = 0 then 'urgent' when i % 3 = 0 then 'normal' else 'low' end, now() - (i || ' seconds')::interval, 'item-' || i from generate_series(1, 200000) i");
  await client.query('create index items_customer_idx on items(customer_id); create index items_status_idx on items(status); create index items_assignee_idx on items(assignee); create index items_category_idx on items(category); create index items_priority_idx on items(priority); create index items_created_idx on items(created_at); analyze customers; analyze items');
  const cases = [
    ['all-omitted', {}], ['customer-rare', { customerId: 998 }], ['customer-hot-skewed', { customerId: 999 }], ['status-hot', { status: 'open' }], ['assignee-null', { assignee: null }],
    ['multiple-selective', { customerId: 998, status: 'open', priority: 'low' }], ['hot-asset-customer-status', { customerId: 999, status: 'rare' }], ['mixed-omitted-null-value', { customerId: 999, assignee: null, status: 'rare', category: null, createdAfter: '2000-01-01T00:00:00Z' }], ['date-range-rare', { createdAfter: '2000-01-01T00:00:00Z', createdBefore: '2100-01-01T00:00:00Z', status: 'rare' }],
  ];
  const correctness = [];
  for (const [name, state] of cases) {
    const count = async (sql, values) => Number((await client.query('select count(*)::integer count from (' + sql.replace(' ' + tail, '') + ') q', values)).rows[0].count);
    const o1Count = await count(o1Sql(), o1Values(state)); const o2 = o2Sql(state); const o2Count = await count(o2.sql, o2.values);
    if (o1Count !== o2Count) throw new Error(name + ': O1/O2 mismatch');
    const o3 = o3Sql(state);
    if (o3 && o1Count !== await count(o3.sql, o3.values)) throw new Error(name + ': O1/O3 mismatch');
    correctness.push({ name, count: o1Count, o3Applicable: Boolean(o3) });
  }
  const modes = ['auto', 'force_custom_plan', 'force_generic_plan']; const plans = {};
  for (const mode of modes) {
    await client.query('set plan_cache_mode = ' + mode); plans[mode] = {};
    for (const [caseName, state] of cases) {
      const o2 = o2Sql(state); const o3 = o3Sql(state); const suffix = mode.replaceAll('_', '');
      plans[mode][caseName] = { o1: await measure('o1_' + suffix, o1Sql(), o1Values(state)), o2: await measure('o2_' + suffix, o2.sql, o2.values), ...(o3 ? { o3: await measure('o3_' + suffix, o3.sql, o3.values) } : {}) };
    }
  }
  const valid = composeSort([{ key: 'priority', direction: 'asc' }, { key: 'createdAt', direction: 'desc' }, { key: 'name', direction: 'asc' }]);
  for (const bad of [[], [{ key: 'drop; select 1', direction: 'asc' }], [{ key: 'name', direction: 'up' }], [{ key: 'name', direction: 'asc' }, { key: 'name', direction: 'desc' }], Array(4).fill({ key: 'name', direction: 'asc' })]) { try { composeSort(bad); throw new Error('bad sort accepted'); } catch (error) { if (error.message === 'bad sort accepted') throw error; } }
  const artifact = sortArtifact();
  const s1Sql = artifact.compiledSql.slice(0, artifact.insertionAt) + 'order by ' + valid + ' ' + artifact.compiledSql.slice(artifact.insertionAt);
  const s2Sql = s2Splice(artifact.source, artifact, valid);
  let staleRejected = false; try { s2Splice(artifact.source + ' ', artifact, valid); } catch { staleRejected = true; }
  const s1Ids = (await client.query(s1Sql, ['rare'])).rows.map((row) => String(row.id));
  const s2Ids = (await client.query(s2Sql, ['rare'])).rows.map((row) => String(row.id));
  const s3Sql = 'select i.id from items i where i.status = $1::text order by i.created_at desc, i.id asc limit ' + limit;
  const s3Ids = (await client.query(s3Sql, ['rare'])).rows.map((row) => String(row.id));
  const s1SingleIds = (await client.query(artifact.compiledSql.slice(0, artifact.insertionAt) + 'order by ' + composeSort([{ key: 'createdAt', direction: 'desc' }]) + ' ' + artifact.compiledSql.slice(artifact.insertionAt), ['rare'])).rows.map((row) => String(row.id));
  if (s1Ids.join(',') !== s2Ids.join(',') || s1SingleIds.join(',') !== s3Ids.join(',') || !staleRejected) throw new Error('sort oracle mismatch');
  const result = { status: 'pass', protocol: { preparedStatements: true, modes, repetitions: 5, strategies: ['O1 static guards', 'O2 precomputed subtraction', 'O3 selected customer/status asset'] }, frozenDataset: { rows: 200000, join: 'items LEFT JOIN customers', skew: 'customer=999/status=rare each 1%', indexes: ['customer_id', 'status', 'assignee', 'category', 'priority', 'created_at'] }, correctness, sort: { composed: valid, hostileRejected: true, s1S2Identical: true, s1S3SingleIdentical: true, staleRejected, artifact: { sourceHash: artifact.sourceHash, insertionAt: artifact.insertionAt } }, plans };
  await writeFile(path.join(root, 'evidence', 'postgres-result.json'), JSON.stringify(result, null, 2) + '\n');
  console.log(JSON.stringify({ status: result.status, cases: correctness, modes }));
} finally { await client.query('drop schema if exists ' + schema + ' cascade'); await client.end(); }
