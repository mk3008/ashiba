import { bigint, pgTable, text } from 'drizzle-orm/pg-core';

// The evaluator creates a fresh runtime schema, so application.ts qualifies
// its SQL with Runtime.schema. This describes the Drizzle-managed row shape.
export const workItems = pgTable('work_items', {
  id: bigint({ mode: 'bigint' }).primaryKey(),
  state: text().notNull(),
  claimedBy: text('claimed_by'),
});
