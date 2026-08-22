import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { pathToFileURL, fileURLToPath } from 'node:url';
import path from 'node:path';
import pg from 'pg';

const root = path.dirname(fileURLToPath(import.meta.url));
const directory = process.env.CANDIDATE_DIR;
const task = process.env.CANDIDATE_TASK;
const url = process.env.ASHIBA_EVALUATION_DATABASE_URL;
if (!directory || !task || !url) throw new Error('CANDIDATE_DIR, CANDIDATE_TASK, and ASHIBA_EVALUATION_DATABASE_URL are required');
const candidate = path.join(root, 'brownfield-candidates', directory);
const schema = `minimum_change_${randomUUID().replaceAll('-', '')}`;
const admin = new pg.Client({ connectionString: url });
const checks = [];
const check = (name, condition) => { if (!condition) throw new Error(name); checks.push({ name, status: 'pass' }); };
const reject = async (name, call) => { try { await call(); throw new Error(`${name} accepted`); } catch (error) { if (String(error.message).includes(`${name} accepted`)) throw error; checks.push({ name, status: 'pass' }); } };

await admin.connect();
try {
  await admin.query(`create schema ${schema}`); await admin.query(`set search_path to ${schema}`);
  const ddl = await readFile(path.join(candidate, 'schema.sql'), 'utf8');
  await admin.query(ddl);
  const label = task === 'summary-rename' ? 'summary' : 'name';
  await admin.query(`insert into customers (id, name) values (1, 'Acme'), (2, 'Beta')`);
  await admin.query(`insert into work_items (id, customer_id, ${label}, priority, assignee, state, created_at) values
    (101, 1, 'Zebra', 'normal', null, 'ready', '2025-01-03T00:00:00Z'),
    (102, 2, 'Alpha', 'urgent', 'lee', 'ready', '2025-01-01T00:00:00Z'),
    (103, null, 'Bravo', 'low', null, 'ready', '2025-01-02T00:00:00Z')`);
  const pool = new pg.Pool({ connectionString: url, options: `-c search_path=${schema}` });
  try {
    const { createReferenceApp } = await import(`${pathToFileURL(path.join(candidate, 'app', 'reference-app.mjs')).href}?run=${Date.now()}`);
    const app = await createReferenceApp(pool);
    check('base omitted/null/value assignee remains', (await app.search({})).length === 3 && (await app.search({ assignee: null })).length === 2 && (await app.search({ assignee: 'lee' })).length === 1);
    check('hostile parameter remains data', (await app.search({ assignee: "lee' or true --" })).length === 0);
    await reject('hostile ordering', () => app.list({ sort: 'name; drop table work_items', direction: 'asc' }));
    const simpleSort = task === 'summary-rename' ? 'summary' : 'name';
    check('finite simple ordering remains usable', (await app.list({ sort: simpleSort, direction: 'asc', limit: 10, offset: 0 })).map((row) => row.id).join(',') === '102,103,101');
    const priorityExpected = task === 'priority-order' ? '101,102,103' : '102,101,103';
    check('computed ordering is explicit and stable', (await app.list({ sort: 'priority', direction: 'asc', limit: 10, offset: 0 })).map((row) => row.id).join(',') === priorityExpected);
    if (task === 'optional-state') {
      check('new state omitted means no predicate', (await app.search({ state: undefined })).length === 3);
      check('new state null uses IS NULL', (await app.search({ state: null })).length === 0);
      check('new state value is bound', (await app.search({ state: 'ready' })).length === 3);
      check('state hostile value remains data', (await app.search({ state: "ready' or true --" })).length === 0);
    }
    if (task === 'priority-order') {
      check('changed CASE priority order and tie-breaker', (await app.list({ sort: 'priority', direction: 'asc', limit: 10, offset: 0 })).map((row) => row.id).join(',') === '101,102,103');
    }
    if (task === 'summary-rename') {
      const row = await app.getWorkItem(103);
      check('renamed result field and nullable join', row?.summary === 'Bravo' && row.customer_name === null && !('name' in row));
      const created = await app.create({ id: '104', customer_id: null, summary: 'Created', priority: 'normal', assignee: null });
      const updated = await app.update({ id: created.id, summary: 'Updated', priority: 'urgent' });
      check('rename reaches write/RETURNING path', created.summary === 'Created' && updated.summary === 'Updated');
    }
    await reject('rollback proof', () => app.claimNext('rollback', {}));
    check('rollback retains ready row', (await app.getWorkItem(102)).state === 'ready');
    const claims = await Promise.all([app.claimNext('one', { source: 'change' }), app.claimNext('two', { source: 'change' })]);
    check('concurrent claims remain distinct', claims[0]?.id !== claims[1]?.id);
    check('final claim audit count', Number((await pool.query('select count(*)::integer as count from claim_audit')).rows[0].count) === 2);
    check('final database claim state', Number((await pool.query("select count(*)::integer as count from work_items where state = 'claimed'")).rows[0].count) === 2);
    console.log(JSON.stringify({ candidate: directory, task, status: 'pass', checks }));
  } finally { await pool.end(); }
} finally { await admin.query(`drop schema if exists ${schema} cascade`); await admin.end(); }
