import { Pool, type PoolConfig } from 'pg';
import type { QueryExecutor, QueryResult, TransactionClient, TransactionPool } from '../access/pgTypes.js';

function asResult<Row>(result: { rows: Row[]; rowCount: number | null }): QueryResult<Row> {
  return { rows: result.rows, rowCount: result.rowCount };
}

export class PgPoolAdapter implements TransactionPool {
  private readonly pool: Pool;

  constructor(config?: PoolConfig) {
    this.pool = new Pool(config);
  }

  async query<Row>(sql: string, values: unknown[] = []): Promise<QueryResult<Row>> {
    return asResult(await this.pool.query(sql, values)) as QueryResult<Row>;
  }

  async connect(): Promise<TransactionClient> {
    const client = await this.pool.connect();
    const executor: QueryExecutor = {
      query: async <Row>(sql: string, values: unknown[] = []) => asResult(await client.query(sql, values)) as QueryResult<Row>,
    };
    return { ...executor, release: () => client.release() };
  }

  async end(): Promise<void> {
    await this.pool.end();
  }
}
