import { preparePostgresQuery, type AshibaPostgresQuerySource } from '@ashiba-ts/driver-adapter-pg';
import type { Pool } from 'pg';
import { queryModels } from './generated/query-models.js';
import { getSql } from './generated/sql-text.js';
import type { Ticket, TicketIdSqlParams } from './types.js';

const query: AshibaPostgresQuerySource<TicketIdSqlParams, Ticket> = { sql: getSql, queryModel: queryModels.get };
export async function getTicket(pool: Pool, id: string): Promise<Ticket | undefined> {
  const params: TicketIdSqlParams = { id };
  const prepared = preparePostgresQuery(query, params, { strictParameterNames: true });
  return (await pool.query<Ticket>(prepared.sql, [...prepared.values])).rows[0];
}
