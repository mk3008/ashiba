import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const schema = readFileSync(fileURLToPath(new URL('../db/ddl/schema.sql', import.meta.url)), 'utf8');
const seed = readFileSync(fileURLToPath(new URL('../db/seed.sql', import.meta.url)), 'utf8');

/** Reset the isolated ticket-queue schema; seed only when behavior tests need it. */
export async function setupTicketQueueDatabase(queryable, { seedData = false } = {}) {
  await queryable.query('drop table if exists ticket_events, tickets cascade');
  await queryable.query(schema);
  if (seedData) await queryable.query(seed);
}
