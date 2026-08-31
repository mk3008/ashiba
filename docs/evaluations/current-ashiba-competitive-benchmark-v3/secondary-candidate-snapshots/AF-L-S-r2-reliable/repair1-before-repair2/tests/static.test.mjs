import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('sqlc generated TypeScript query module is present', async () => {
  const generated = await readFile(new URL('../src/generated/queries_sql.ts', import.meta.url), 'utf8');
  assert.match(generated, /export async function listTicketsByIdAsc/);
  assert.match(generated, /export async function assignTicket/);
});
