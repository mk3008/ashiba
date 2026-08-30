import { randomBytes } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const { Client } = pg;
const HERE = dirname(fileURLToPath(import.meta.url));
export const SCHEMA_RE = /^ashiba_v3_[a-z0-9]{16}$/;

export function makeNonceSchema() {
  return `ashiba_v3_${randomBytes(8).toString('hex')}`;
}

export function quoteSchema(schema) {
  if (!SCHEMA_RE.test(schema)) throw new Error(`unsafe schema identifier: ${schema}`);
  return `"${schema}"`;
}

function render(sql, schema) {
  return sql.replaceAll('{{schema}}', quoteSchema(schema));
}

async function textFile(name) {
  return readFile(join(HERE, name), 'utf8');
}

export async function createFixture(databaseUrl, schema = makeNonceSchema()) {
  const client = new Client({ connectionString: databaseUrl });
  const qualifiedSchema = quoteSchema(schema);
  await client.connect();
  try {
    await client.query(`CREATE SCHEMA ${qualifiedSchema}`);
    await client.query(render(await textFile('schema.sql'), schema));
    await client.query(render(await textFile('seed.sql'), schema));
    return { databaseUrl, schema, qualifiedSchema, client };
  } catch (error) {
    await client.query(`DROP SCHEMA IF EXISTS ${qualifiedSchema} CASCADE`).catch(() => undefined);
    await client.end().catch(() => undefined);
    throw error;
  }
}

export async function dropFixture(fixture) {
  if (!fixture?.client) return { status: 'not-run' };
  try {
    await fixture.client.query(`DROP SCHEMA IF EXISTS ${fixture.qualifiedSchema} CASCADE`);
    return { status: 'pass' };
  } catch (error) {
    return { status: 'fail', error: error instanceof Error ? error.message : String(error) };
  } finally {
    await fixture.client.end().catch(() => undefined);
  }
}

export async function withClient(databaseUrl, callback) {
  const client = new Client({ connectionString: databaseUrl });
  await client.connect();
  try {
    return await callback(client);
  } finally {
    await client.end().catch(() => undefined);
  }
}

export async function databaseState(databaseUrl, schema) {
  const s = quoteSchema(schema);
  return withClient(databaseUrl, async (client) => {
    // PostgreSQL clients process a single query at a time. Keep oracle reads
    // serial so successful reference controls do not emit a pg deprecation.
    const tickets = await client.query(`SELECT id::text AS id, title, status::text AS status, assignee, priority, metadata FROM ${s}.tickets ORDER BY id`);
    const ticketAudit = await client.query(`SELECT ticket_id::text AS ticket_id, action, detail FROM ${s}.ticket_audit ORDER BY audit_id`);
    const accounts = await client.query(`SELECT account_id::text AS account_id, balance_cents::text AS balance_cents FROM ${s}.accounts ORDER BY account_id`);
    const transferAudit = await client.query(`SELECT from_account_id::text AS from_account_id, to_account_id::text AS to_account_id, amount_cents::text AS amount_cents, note FROM ${s}.transfer_audit ORDER BY audit_id`);
    const workItems = await client.query(`SELECT id::text AS id, state, claimed_by FROM ${s}.work_items ORDER BY id`);
    return {
      tickets: tickets.rows,
      ticketAudit: ticketAudit.rows,
      accounts: accounts.rows,
      transferAudit: transferAudit.rows,
      workItems: workItems.rows,
    };
  });
}

export async function scalar(databaseUrl, schema, sql, params = []) {
  return withClient(databaseUrl, async (client) => {
    const result = await client.query(sql.replaceAll('{{schema}}', quoteSchema(schema)), params);
    return result.rows[0]?.value ?? null;
  });
}
