export interface QueryResult<Row> {
  rows: Row[];
  rowCount: number | null;
}

export interface QueryExecutor {
  query<Row>(sql: string, values?: unknown[]): Promise<QueryResult<Row>>;
}

export interface TransactionClient extends QueryExecutor {
  release(): void;
}

export interface TransactionPool extends QueryExecutor {
  connect(): Promise<TransactionClient>;
}
