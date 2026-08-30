import { randomBytes } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const { Client } = pg;
const HERE = dirname(fileURLToPath(import.meta.url));
export const SCHEMA_RE = /^ashiba_v3_[a-z0-9]{16}$/;
export const ROLE_RE = /^ashiba_v3_candidate_[a-z0-9]{16}$/;

export function makeNonceSchema() {
  return `ashiba_v3_${randomBytes(8).toString('hex')}`;
}

export function makeNonceRole() {
  return `ashiba_v3_candidate_${randomBytes(8).toString('hex')}`;
}

export function quoteSchema(schema) {
  if (!SCHEMA_RE.test(schema)) throw new Error(`unsafe schema identifier: ${schema}`);
  return `"${schema}"`;
}

function quoteRole(role) {
  if (!ROLE_RE.test(role)) throw new Error(`unsafe role identifier: ${role}`);
  return `"${role}"`;
}

function render(sql, schema) {
  return sql.replaceAll('{{schema}}', quoteSchema(schema));
}

async function textFile(name) {
  return readFile(join(HERE, name), 'utf8');
}

function candidateUrl(adminDatabaseUrl, role, password) {
  const url = new URL(adminDatabaseUrl);
  url.username = role;
  url.password = password;
  return url.toString();
}

async function provisionCandidateRole(client, schema, role, password) {
  const qualifiedSchema = quoteSchema(schema);
  const qualifiedRole = quoteRole(role);
  // `password` is generated as base64url and never written to an evidence file.
  await client.query(`CREATE ROLE ${qualifiedRole} LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT CONNECTION LIMIT 4 PASSWORD '${password}'`);
  await client.query(`ALTER ROLE ${qualifiedRole} SET statement_timeout TO '10s'`);
  await client.query(`ALTER ROLE ${qualifiedRole} SET search_path TO ${qualifiedSchema}`);
  await client.query(`GRANT USAGE ON SCHEMA ${qualifiedSchema} TO ${qualifiedRole}`);
  await client.query(`GRANT USAGE ON TYPE ${qualifiedSchema}.ticket_status, ${qualifiedSchema}.order_state, ${qualifiedSchema}.money_cents TO ${qualifiedRole}`);
  await client.query(`GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE ${qualifiedSchema}.tickets, ${qualifiedSchema}.ticket_audit, ${qualifiedSchema}.accounts, ${qualifiedSchema}.transfer_audit, ${qualifiedSchema}.work_items TO ${qualifiedRole}`);
  await client.query(`GRANT SELECT ON TABLE ${qualifiedSchema}.customers, ${qualifiedSchema}.orders TO ${qualifiedRole}`);
  await client.query(`GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA ${qualifiedSchema} TO ${qualifiedRole}`);
}

export async function createFixture(adminDatabaseUrl, schema = makeNonceSchema()) {
  const client = new Client({ connectionString: adminDatabaseUrl });
  const qualifiedSchema = quoteSchema(schema);
  const role = makeNonceRole();
  const password = randomBytes(24).toString('base64url');
  await client.connect();
  try {
    await client.query(`CREATE SCHEMA ${qualifiedSchema}`);
    await client.query(render(await textFile('schema.sql'), schema));
    await client.query(render(await textFile('seed.sql'), schema));
    await provisionCandidateRole(client, schema, role, password);
    return {
      adminDatabaseUrl,
      candidateDatabaseUrl: candidateUrl(adminDatabaseUrl, role, password),
      schema,
      qualifiedSchema,
      role,
      client,
    };
  } catch (error) {
    await client.query(`DROP SCHEMA IF EXISTS ${qualifiedSchema} CASCADE`).catch(() => undefined);
    await client.query(`DROP ROLE IF EXISTS ${quoteRole(role)}`).catch(() => undefined);
    await client.end().catch(() => undefined);
    throw error;
  }
}

export async function dropFixture(fixture) {
  if (!fixture?.client) return { status: 'not-run' };
  const cleanup = { schema: 'not-run', role: 'not-run' };
  try {
    await fixture.client.query(`DROP SCHEMA IF EXISTS ${fixture.qualifiedSchema} CASCADE`);
    cleanup.schema = 'pass';
    await fixture.client.query(`DROP OWNED BY ${quoteRole(fixture.role)}`);
    await fixture.client.query(`DROP ROLE IF EXISTS ${quoteRole(fixture.role)}`);
    cleanup.role = 'pass';
    return { status: 'pass', ...cleanup };
  } catch (error) {
    return { status: 'fail', ...cleanup, error: error instanceof Error ? error.message : String(error) };
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
