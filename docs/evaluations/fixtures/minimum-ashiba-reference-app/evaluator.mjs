import { readFile, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import pg from 'pg';
import { lowerNamed } from './named-lowering.mjs';
import { createReferenceApp } from './app/reference-app.mjs';

const root = path.dirname(fileURLToPath(import.meta.url));
const url = process.env.ASHIBA_EVALUATION_DATABASE_URL;
if (!url) throw new Error('ASHIBA_EVALUATION_DATABASE_URL is required');
const admin = new pg.Client({ connectionString: url });
const schema = `minimum_ashiba_${randomUUID().replaceAll('-', '')}`;
const checks = [];
const check = (name, condition, detail = '') => { if (!condition) throw new Error(`${name}: ${detail}`); checks.push({ name, status: 'pass' }); };
const expectReject = async (name, action) => { try { await action(); throw new Error(`${name}: accepted`); } catch (error) { if (String(error.message).includes(`${name}: accepted`)) throw error; checks.push({ name, status: 'pass', error: String(error.message) }); } };

await admin.connect();
try {
  await admin.query(`create schema ${schema}`);
  await admin.query(`set search_path to ${schema}`);
  await admin.query(await readFile(path.join(root, 'schema.sql'), 'utf8'));
  await admin.query(`insert into customers (id, name) values (9007199254740991, 'Acme'), (2, 'Beta')`);
  await admin.query(`insert into work_items (id, customer_id, name, priority, assignee, state, created_at) values
    (101, 9007199254740991, 'Zebra', 'normal', null, 'ready', '2025-01-03T00:00:00Z'),
    (102, 2, 'Alpha', 'urgent', 'lee', 'ready', '2025-01-01T00:00:00Z'),
    (103, null, 'Bravo', 'low', null, 'ready', '2025-01-02T00:00:00Z'),
    (104, 2, 'Alpha', 'urgent', 'lee', 'done', '2025-01-04T00:00:00Z')`);
  const pool = new pg.Pool({ connectionString: url, options: `-c search_path=${schema}` });
  const app = await createReferenceApp(pool);
  try {
    const lexical = lowerNamed(`select :x::text as a, :x::text as b, ':ignored' as ":ignored" -- :ignored\n /* :ignored */`, { x: 'ok' });
    check('named lowering preserves lexical contexts', lexical.sql.includes("$1::text") && lexical.sql.includes("$2::text") && lexical.sql.includes("':ignored'") && lexical.sql.includes('":ignored"') && lexical.orderedNames.join(',') === 'x,x');
    check('named lowering runs through PostgreSQL', (await pool.query(lexical.sql, lexical.values)).rows[0].a === 'ok');
    const joined = await app.getWorkItem(103);
    check('single-row lookup includes LEFT JOIN nullable result', joined?.id === '103' && joined.customer_name === null);
    check('BIGINT survives as string through pg default representation', (await app.getWorkItem('9007199254740991')) === null);
    check('omitted predicate does not filter', (await app.search({})).map((row) => row.id).join(',') === '101,102,103,104');
    check('explicit null searches SQL NULL', (await app.search({ assignee: null })).map((row) => row.id).join(',') === '101,103');
    check('concrete value uses bound predicate', (await app.search({ assignee: 'lee' })).map((row) => row.id).join(',') === '102,104');
    check('mixed three-state filters', (await app.search({ assignee: undefined, customerId: null })).map((row) => row.id).join(',') === '103');
    check('hostile parameter is data', (await app.search({ assignee: "lee' or true --" })).length === 0);
    check('simple ordering and stable tie-breaker', (await app.list({ sort: 'name', direction: 'asc', limit: 10, offset: 0 })).map((row) => row.id).join(',') === '102,103,101');
    check('CASE business ordering', (await app.list({ sort: 'priority', direction: 'asc', limit: 10, offset: 0 })).map((row) => row.id).join(',') === '102,101,103');
    check('pagination binds values', (await app.list({ sort: 'createdAt', direction: 'asc', limit: 1, offset: 1 }))[0].id === '103');
    await expectReject('hostile sort key', () => app.list({ sort: 'name; drop table work_items', direction: 'asc' }));
    await expectReject('hostile sort direction', () => app.list({ sort: 'name', direction: 'asc; drop table work_items' }));
    check('final table survives hostile ordering', (await app.search({})).length === 4);
    const created = await app.create({ id: '105', customer_id: null, name: 'New', priority: 'normal', assignee: null });
    const updated = await app.update({ id: created.id, name: 'Renamed', priority: 'urgent' });
    check('insert/update RETURNING', created.id === '105' && updated?.name === 'Renamed' && updated.version === 1);
    await expectReject('transaction rollback on audit failure', () => app.claimNext('rollback-user', {}));
    check('failed audit rolls back claim', (await app.getWorkItem(102)).state === 'ready');
    const claims = await Promise.all([app.claimNext('one', { source: 'e2e' }), app.claimNext('two', { source: 'e2e' })]);
    check('concurrent claim yields distinct work items', claims.every(Boolean) && claims[0].id !== claims[1].id);
    check('claim audit is transactionally present', Number((await pool.query('select count(*)::integer as count from claim_audit')).rows[0].count) === 2);
    const source = await Promise.all(Object.values(app.assets));
    check('canonical assets have no interpolation marker', source.every((text) => !text.includes('${')));
    const outcome = { schema, status: 'pass', checks, postgres: (await admin.query('show server_version')).rows[0].server_version, finalState: (await pool.query('select id, state, assignee from work_items order by id')).rows };
    await writeFile(path.join(root, 'results.json'), `${JSON.stringify(outcome, null, 2)}\n`);
    console.log(JSON.stringify(outcome));
  } finally { await pool.end(); }
} finally { await admin.query(`drop schema if exists ${schema} cascade`); await admin.end(); }
