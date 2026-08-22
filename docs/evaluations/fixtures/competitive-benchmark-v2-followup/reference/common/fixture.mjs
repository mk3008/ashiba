import { randomBytes } from 'node:crypto';
import pg from 'pg';

const { Client } = pg;
export const SCHEMA_RE = /^ashiba_followup_[a-z0-9]{16}$/;
export function makeSchema() { const schema = `ashiba_followup_${randomBytes(8).toString('hex')}`; if (!SCHEMA_RE.test(schema)) throw new Error(`unsafe generated schema: ${schema}`); return schema; }
export function qi(schema) { if (!SCHEMA_RE.test(schema)) throw new Error(`unsafe schema identifier: ${schema}`); return `"${schema}"`; }
export async function createFixture(databaseUrl, schema = makeSchema()) {
  const client = new Client({ connectionString: databaseUrl }), s = qi(schema); await client.connect();
  try {
    await client.query(`create schema ${s}`);
    await client.query(`create table ${s}.accounts (account_id bigint primary key, balance_cents bigint not null check (balance_cents >= 0))`);
    await client.query(`create table ${s}.transfer_audit (audit_id bigint generated always as identity primary key, from_account_id bigint not null references ${s}.accounts(account_id), to_account_id bigint not null references ${s}.accounts(account_id), amount_cents bigint not null, note text not null)`);
    await client.query(`create table ${s}.work_items (id bigint primary key, state text not null check (state in ('queued', 'claimed')), claimed_by text null)`);
    await client.query(`create table ${s}.pagination_items (id bigint primary key, payload text not null)`);
    await client.query(`insert into ${s}.accounts(account_id, balance_cents) values ($1, $2), ($3, $4)`, ['7001', '10000', '7002', '5000']);
    await client.query(`insert into ${s}.work_items(id, state, claimed_by) values ($1, 'queued', null), ($2, 'queued', null)`, ['8001', '8002']);
    await client.query(`insert into ${s}.pagination_items(id, payload) select n, 'item-' || n::text from generate_series(1, 30000) as n`);
    return { databaseUrl, schema, qualifiedSchema: s, client };
  } catch (error) { await client.query(`drop schema if exists ${s} cascade`).catch(() => undefined); await client.end().catch(() => undefined); throw error; }
}
export async function dropFixture(fixture) { if (!fixture?.client) return { status: 'not-run' }; try { await fixture.client.query(`drop schema if exists ${fixture.qualifiedSchema} cascade`); return { status: 'pass' }; } catch (error) { return { status: 'fail', error: error instanceof Error ? error.message : String(error) }; } finally { await fixture.client.end().catch(() => undefined); } }
export async function state(databaseUrl, schema) { const client = new Client({ connectionString: databaseUrl }); await client.connect(); try { const accounts = await client.query(`select account_id::text as account_id, balance_cents::text as balance_cents from ${qi(schema)}.accounts order by account_id`); const audit = await client.query(`select from_account_id::text as from_account_id, to_account_id::text as to_account_id, amount_cents::text as amount_cents, note from ${qi(schema)}.transfer_audit order by audit_id`); const work = await client.query(`select id::text as id, state, claimed_by from ${qi(schema)}.work_items order by id`); return { accounts: accounts.rows, audit: audit.rows, work: work.rows }; } finally { await client.end(); } }
