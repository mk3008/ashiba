import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { Pool } from 'pg';
import { bindNamedParameters } from '@ashiba-ts/named-parameters';
import { compileNamedParameters } from '@ashiba-ts/named-parameters/compiler';

const [appDirectory, schemaPath] = process.argv.slice(2);

if (!appDirectory || !schemaPath || !process.env.DATABASE_URL) {
  throw new Error('Usage: DATABASE_URL=<url> node .runner-owned-postgres-oracle.mjs <app-directory> <schema-path>');
}

const schema = `fresh_agent_${process.env.FRESH_AGENT_SCHEMA ?? 'validation'}`.replace(/[^a-z0-9_]/gi, '_');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, options: `-c search_path=${schema}` });

try {
  await pool.query(`drop schema if exists ${schema} cascade`);
  await pool.query(`create schema ${schema}`);
  await pool.query(await readFile(schemaPath, 'utf8'));
  await pool.query(`
    insert into tickets (id, subject, status, assignee_id, created_at, updated_at) values
      (1, 'alpha', 'open', null, '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'),
      (2, 'beta', 'open', 'agent-1', '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'),
      (3, 'alpha', 'closed', null, '2026-01-02T00:00:00Z', '2026-01-02T00:00:00Z')
  `);

  const modulePath = pathToFileURL(resolve(appDirectory, 'dist/index.js')).href;
  const { createTicketApplication } = await import(`${modulePath}?oracle=${Date.now()}`);
  assert.equal(typeof createTicketApplication, 'function', 'candidate must export createTicketApplication from dist/index.js');
  const application = createTicketApplication(pool);

  const open = await application.listTickets({ status: 'open', assigneeId: null, sort: 'createdAt.asc', limit: 10, offset: 0 });
  assert.deepEqual(open.map((ticket) => Number(ticket.id)), [1, 2], 'status filter and stable id tie-breaker must work');
  for (const sort of ['createdAt.asc', 'createdAt.desc', 'subject.asc', 'subject.desc']) {
    const rows = await application.listTickets({ status: null, assigneeId: null, sort, limit: 10, offset: 0 });
    assert.equal(rows.length, 3, `${sort} must list all rows`);
  }
  if (process.env.EXTRA_SORT) {
    const rows = await application.listTickets({ status: null, assigneeId: null, sort: process.env.EXTRA_SORT, limit: 10, offset: 0 });
    assert.equal(rows.length, 3, `${process.env.EXTRA_SORT} must be a reviewed finite sort option`);
  }
  const page = await application.listTickets({ status: null, assigneeId: null, sort: 'createdAt.asc', limit: 1, offset: 1 });
  assert.equal(page.length, 1, 'pagination must work');
  await assert.rejects(() => application.listTickets({ status: null, assigneeId: null, sort: 'user supplied sql', limit: 10, offset: 0 }), /sort|unsupported|invalid/i);

  assert.equal(Number((await application.getTicket(1)).id), 1, 'get must return a ticket');
  assert.equal(await application.getTicket(1, 'closed'), null, 'optional get filter must constrain results');
  assert.equal(Number((await application.getTicket(1, 'open')).id), 1, 'matching optional get filter must return a ticket');
  const hostile = await application.listTickets({ status: "open' or '1'='1", assigneeId: null, sort: 'createdAt.asc', limit: 10, offset: 0 });
  assert.equal(hostile.length, 0, 'hostile value must remain a bound value, not SQL syntax');

  await application.assignTicket({ ticketId: 1, assigneeId: 'agent-2', actorId: 'operator-1' });
  const assignedTicket = await application.getTicket(1);
  assert.equal('assigneeId' in assignedTicket ? assignedTicket.assigneeId : assignedTicket.assignee_id, 'agent-2', 'native transaction must commit update');
  assert.equal(Number((await pool.query('select count(*) from ticket_events where ticket_id = 1')).rows[0].count), 1, 'native transaction must commit audit');
  await assert.rejects(() => application.assignTicket({ ticketId: 3, assigneeId: 'agent-3', actorId: 'operator-1', failAudit: true }));
  const rolledBackTicket = await application.getTicket(3);
  assert.equal('assigneeId' in rolledBackTicket ? rolledBackTicket.assigneeId : rolledBackTicket.assignee_id, null, 'injected audit failure must roll back update');
  assert.equal(Number((await pool.query('select count(*) from ticket_events where ticket_id = 3')).rows[0].count), 0, 'injected audit failure must roll back audit');

  const prepared = compileNamedParameters('select :expected');
  assert.throws(() => bindNamedParameters(prepared, {}), /missing/i, 'binder must reject missing parameters before DB');
  assert.throws(() => bindNamedParameters(prepared, { expected: 1, extra: 2 }), /unused/i, 'binder must reject unused parameters before DB');
  console.log(JSON.stringify({ oracle: 'passed', schema }));
} finally {
  await pool.query(`drop schema if exists ${schema} cascade`).catch(() => undefined);
  await pool.end();
}
