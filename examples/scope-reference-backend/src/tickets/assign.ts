import { preparePostgresQuery, type AshibaPostgresQuerySource } from '@ashiba-ts/driver-adapter-pg';
import type { Pool } from 'pg';
import { queryModels } from './generated/query-models.js';
import { assignTicketSql, insertEventSql } from './generated/sql-text.js';
import type { AssignTicketSqlParams, InsertTicketEventSqlParams, Ticket } from './types.js';

const updateQuery: AshibaPostgresQuerySource<AssignTicketSqlParams, Ticket> = {
  sql: assignTicketSql,
  queryModel: queryModels.assignTicket,
};
const eventQuery: AshibaPostgresQuerySource<InsertTicketEventSqlParams> = {
  sql: insertEventSql,
  queryModel: queryModels.insertEvent,
};
export async function assignTicket(pool: Pool, input: { ticketId: string; assigneeId: string; actorId: string; note?: string }): Promise<Ticket | undefined> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const updateParams: AssignTicketSqlParams = { assigneeId: input.assigneeId, ticketId: input.ticketId };
    const update = preparePostgresQuery(updateQuery, updateParams, { strictParameterNames: true });
    const ticket = (await client.query<Ticket>(update.sql, [...update.values])).rows[0];
    if (!ticket) throw new Error(`Ticket not found: ${input.ticketId}`);
    const eventParams: InsertTicketEventSqlParams = {
      ticketId: input.ticketId, actorId: input.actorId, note: input.note ?? null,
    };
    const event = preparePostgresQuery(eventQuery, eventParams, { strictParameterNames: true });
    await client.query(event.sql, [...event.values]);
    await client.query('COMMIT');
    return ticket;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally { client.release(); }
}
