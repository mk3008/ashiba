import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const databaseUrl = process.env.ASHIBA_REFERENCE_DATABASE_URL;
const [candidatePath] = process.argv.slice(2);
if (!databaseUrl) throw new Error('ASHIBA_REFERENCE_DATABASE_URL is required');
if (!candidatePath) throw new Error('usage: verify-primitive-only-oracle <candidate-path>');

const root = path.resolve(candidatePath);
const { default: pg } = await import(pathToFileURL(path.join(root, 'node_modules', 'pg', 'esm', 'index.mjs')).href);
const { bindNamedParameters, NamedParameterError } = await import(pathToFileURL(path.join(root, 'node_modules', '@ashiba-ts', 'named-parameters', 'dist', 'index.js')).href);
const { compileNamedParameters } = await import(pathToFileURL(path.join(root, 'node_modules', '@ashiba-ts', 'named-parameters', 'dist', 'compiler.js')).href);
const pool = new pg.Pool({ connectionString: databaseUrl });

async function sql(text, values) {
  return pool.query(text, values);
}

try {
  await sql('DROP TABLE IF EXISTS ticket_events; DROP TABLE IF EXISTS tickets;');
  await sql(readFileSync(path.join(root, 'schema.sql'), 'utf8'));
  await sql("INSERT INTO tickets (subject, status, assignee_id, created_at) VALUES ('Same', 'open', NULL, '2026-01-01T00:00:00Z'), ('Zulu', 'closed', 9, '2026-01-04T00:00:00Z'), ('Alpha', 'open', 3, '2026-01-03T00:00:00Z'), ('Same', 'open', 3, '2026-01-02T00:00:00Z');");

  process.chdir(root);
  const { createTicketApplication } = await import(`${pathToFileURL(path.join(root, 'dist', 'src', 'tickets', 'application', 'tickets.js')).href}?oracle=${Date.now()}`);
  const getSql = readFileSync(path.join(root, 'src', 'tickets', 'sql', 'get.sql'), 'utf8');
  const getBinding = compileNamedParameters(getSql, { rendering: { style: 'indexed', prefix: '$' } });
  assert.throws(() => bindNamedParameters(getBinding, {}), (error) => error instanceof NamedParameterError && error.code === 'ASHIBA_MISSING_PARAMETER');
  assert.throws(() => bindNamedParameters(getBinding, { id: 1, status: null, extra: true }), (error) => error instanceof NamedParameterError && error.code === 'ASHIBA_UNUSED_PARAMETER');

  const application = createTicketApplication(databaseUrl);
  try {
    assert.deepEqual((await application.list({ sortBy: 'createdAt', sortDirection: 'asc' })).map((row) => Number(row.id)), [1, 4, 3, 2]);
    assert.deepEqual((await application.list({ sortBy: 'createdAt', sortDirection: 'desc' })).map((row) => Number(row.id)), [2, 3, 4, 1]);
    assert.deepEqual((await application.list({ sortBy: 'subject', sortDirection: 'asc' })).map((row) => Number(row.id)), [3, 1, 4, 2]);
    assert.deepEqual((await application.list({ sortBy: 'subject', sortDirection: 'desc' })).map((row) => Number(row.id)), [2, 4, 1, 3]);
    assert.deepEqual((await application.list({ status: 'open', sortBy: 'createdAt', sortDirection: 'asc' })).map((row) => Number(row.id)), [1, 4, 3]);
    assert.deepEqual((await application.list({ assigneeId: 3, sortBy: 'createdAt', sortDirection: 'asc' })).map((row) => Number(row.id)), [4, 3]);
    assert.deepEqual((await application.list({ limit: 1, offset: 1, sortBy: 'createdAt', sortDirection: 'asc' })).map((row) => Number(row.id)), [4]);
    assert.equal((await application.get(3))?.subject, 'Alpha');
    assert.equal((await application.get(3, 'open'))?.subject, 'Alpha');
    assert.equal(await application.get(3, 'closed'), null);
    const hostile = "open' OR 1=1 --";
    assert.equal((await application.list({ status: hostile })).length, 0);
    assert.equal(Number((await sql('SELECT count(*)::int AS count FROM tickets')).rows[0].count), 4);
    await application.assign(1, 77);
    assert.equal(Number((await sql('SELECT assignee_id FROM tickets WHERE id = 1')).rows[0].assignee_id), 77);
    assert.equal(Number((await sql('SELECT count(*)::int AS count FROM ticket_events WHERE ticket_id = 1')).rows[0].count), 1);
    await sql("CREATE OR REPLACE FUNCTION ashiba_fail_audit() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'injected audit failure'; END; $$; CREATE TRIGGER ashiba_fail_audit BEFORE INSERT ON ticket_events FOR EACH ROW EXECUTE FUNCTION ashiba_fail_audit();");
    await assert.rejects(() => application.assign(1, 88), /injected audit failure/);
    assert.equal(Number((await sql('SELECT assignee_id FROM tickets WHERE id = 1')).rows[0].assignee_id), 77);
    await sql('DROP TRIGGER ashiba_fail_audit ON ticket_events; DROP FUNCTION ashiba_fail_audit();');
  } finally {
    await application.dispose();
  }
} finally {
  await pool.end();
}

console.log('Primitive-only oracle: PASS');
