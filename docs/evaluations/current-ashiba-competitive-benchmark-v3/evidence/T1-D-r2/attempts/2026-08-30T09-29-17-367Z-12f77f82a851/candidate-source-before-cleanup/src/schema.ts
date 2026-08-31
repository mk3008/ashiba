import { bigint, pgSchema, text } from 'drizzle-orm/pg-core';

/** The evaluator creates a unique schema for every application instance. */
export function createSchema(schemaName: string) {
  const schema = pgSchema(schemaName);

  const accounts = schema.table('accounts', {
    accountId: bigint('account_id', { mode: 'bigint' }).primaryKey(),
    balanceCents: bigint('balance_cents', { mode: 'bigint' }).notNull(),
  });
  const transferAudit = schema.table('transfer_audit', {
    auditId: bigint('audit_id', { mode: 'bigint' }).primaryKey().generatedAlwaysAsIdentity(),
    fromAccountId: bigint('from_account_id', { mode: 'bigint' }).notNull(),
    toAccountId: bigint('to_account_id', { mode: 'bigint' }).notNull(),
    amountCents: bigint('amount_cents', { mode: 'bigint' }).notNull(),
    note: text('note').notNull(),
  });

  return { accounts, transferAudit };
}
