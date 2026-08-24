import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import type { Pool } from 'pg';
import { prepareNamedSql } from '../sql.js';
import type { Ticket, TicketIdSqlParams } from './types.js';

const source = readFileSync(fileURLToPath(new URL('./get.sql', import.meta.url)), 'utf8');
export async function getTicket(pool: Pool, id: string): Promise<Ticket | undefined> {
  const params: TicketIdSqlParams = { id };
  const prepared = prepareNamedSql(source, params);
  return (await pool.query<Ticket>(prepared.sql, prepared.values)).rows[0];
}
