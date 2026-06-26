import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { config } from 'dotenv';

export default async function globalSetup() {
  config();

  if (process.env.ASHIBA_DB_URL || process.env.ASHIBA_SKIP_DB_BACKED_TESTS === '1') {
    return () => undefined;
  }

  const container = await startPostgresContainer();
  process.env.ASHIBA_DB_URL = container.getConnectionUri();

  return async () => {
    await container.stop();
  };
}

async function startPostgresContainer(): Promise<StartedPostgreSqlContainer> {
  return new PostgreSqlContainer('postgres:18')
    .withDatabase('ashiba')
    .withUsername('ashiba')
    .withPassword('ashiba')
    .start();
}
