import { bigint, integer, jsonb, pgSchema, text, timestamp } from 'drizzle-orm/pg-core';

/** Feature-local query seam. Canonical SQL lives inside this ticket slice. */
export function ticketReadModel(schemaName: string) {
  const schema = pgSchema(schemaName);
  const ticketStatus = schema.enum('ticket_status', ['open', 'pending', 'closed']);

  return {
    tickets: schema.table('tickets', {
      id: bigint('id', { mode: 'bigint' }).primaryKey().generatedAlwaysAsIdentity(),
      title: text('title').notNull(),
      status: ticketStatus('status').notNull(),
      assignee: text('assignee'),
      priority: integer('priority').notNull(),
      createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull(),
      metadata: jsonb('metadata').$type<Record<string, unknown>>().notNull(),
    }),
    ticketAudit: schema.table('ticket_audit', {
      auditId: bigint('audit_id', { mode: 'bigint' }).primaryKey().generatedAlwaysAsIdentity(),
      ticketId: bigint('ticket_id', { mode: 'bigint' }).notNull(),
      action: text('action').notNull(),
      detail: text('detail').notNull(),
      createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull(),
    }),
  };
}
