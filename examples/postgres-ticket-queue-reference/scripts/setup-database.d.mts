export type SqlQueryable = {
  query(sql: string): Promise<unknown>;
};

export function setupTicketQueueDatabase(
  queryable: SqlQueryable,
  options?: { seedData?: boolean },
): Promise<void>;
