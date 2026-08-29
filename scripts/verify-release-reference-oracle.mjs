import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const databaseUrl = process.env.ASHIBA_REFERENCE_DATABASE_URL;
if (!databaseUrl) throw new Error('ASHIBA_REFERENCE_DATABASE_URL is required');

const [vsaPath, layeredPath] = process.argv.slice(2);
if (!vsaPath || !layeredPath) throw new Error('usage: verify-release-reference-oracle <vsa-path> <layered-path>');

async function runSql(sql) {
  const { default: pg } = await import(pathToFileURL(`${vsaPath}/node_modules/pg/esm/index.mjs`).href);
  const pool = new pg.Pool({ connectionString: databaseUrl });
  try { await pool.query(sql); } finally { await pool.end(); }
}

async function reset(schemaPath) {
  await runSql('DROP TABLE IF EXISTS ticket_events; DROP TABLE IF EXISTS tickets;');
  await runSql(readFileSync(schemaPath, 'utf8'));
  await runSql("INSERT INTO tickets (subject, status, assignee_id, created_at) VALUES ('Older open', 'open', NULL, '2026-01-01T00:00:00Z'), ('Newest closed', 'closed', 9, '2026-01-03T00:00:00Z'), ('Middle open', 'open', 3, '2026-01-02T00:00:00Z');");
}

async function ticketState(id) {
  const { default: pg } = await import(pathToFileURL(`${vsaPath}/node_modules/pg/esm/index.mjs`).href);
  const pool = new pg.Pool({ connectionString: databaseUrl });
  try { return (await pool.query('SELECT assignee_id FROM tickets WHERE id = $1', [id])).rows[0]; } finally { await pool.end(); }
}

async function assertReference(label, createApplication) {
  const application = createApplication(databaseUrl);
  try {
    const listed = await application.list({ status: 'open', limit: 1, offset: 0, sortKey: 'subject', sortDirection: 'desc', sortField: 'subject' });
    const rows = listed.rows ?? listed;
    assert.equal(rows.length, 1, `${label}: list pagination`);
    assert.equal(rows[0].subject, 'Older open', `${label}: optional filter and reviewed sort`);
    const id = rows[0].id;
    const fetched = await application.get(id);
    const fetchedRows = fetched.rows ?? (fetched ? [fetched] : []);
    assert.equal(fetchedRows.length, 1, `${label}: get`);
    const assigned = await application.assign(id, 77);
    assert.ok(assigned, `${label}: assign`);
    assert.equal(Number((await ticketState(id)).assignee_id), 77, `${label}: committed transaction`);
    await runSql("CREATE OR REPLACE FUNCTION ashiba_fail_audit() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'injected audit failure'; END; $$; CREATE TRIGGER ashiba_fail_audit BEFORE INSERT ON ticket_events FOR EACH ROW EXECUTE FUNCTION ashiba_fail_audit();");
    await assert.rejects(() => application.assign(id, 88), /injected audit failure/);
    assert.equal(Number((await ticketState(id)).assignee_id), 77, `${label}: rollback keeps prior assignee`);
    await runSql('DROP TRIGGER ashiba_fail_audit ON ticket_events; DROP FUNCTION ashiba_fail_audit();');
  } finally { await application.close?.() ?? application.pool?.end?.(); }
}

await reset(`${vsaPath}/src/tickets/sql/schema.sql`);
const { createTicketApplication } = await import(pathToFileURL(`${vsaPath}/src/tickets/application/tickets.mjs`).href);
await assertReference('VSA', (url) => createTicketApplication(url));

await reset(`${layeredPath}/sql/schema.sql`);
const { createTicketService } = await import(pathToFileURL(`${layeredPath}/dist/src/index.js`).href);
await assertReference('layered', (url) => {
  const { service, pool } = createTicketService(url);
  return { list: (input) => service.list({ ...input, sortField: input.sortField ?? input.sortKey, sortDirection: input.sortDirection }), get: (id) => service.get(String(id)), assign: (id, assignee) => service.assign(String(id), assignee), close: () => pool.end() };
});

console.log('release reference oracle: PASS');
