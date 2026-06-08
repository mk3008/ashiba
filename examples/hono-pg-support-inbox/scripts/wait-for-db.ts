import 'dotenv/config';

import { pathToFileURL } from 'node:url';
import { Pool } from 'pg';

const DEFAULT_TIMEOUT_MS = 30_000;
const DEFAULT_INTERVAL_MS = 1_000;

function resolveDatabaseUrl(): string {
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }
  const host = process.env.ASHIBA_TEST_DB_HOST ?? 'localhost';
  const port = process.env.ASHIBA_TEST_DB_PORT ?? '5432';
  const name = process.env.ASHIBA_TEST_DB_NAME ?? 'ashiba';
  const user = process.env.ASHIBA_TEST_DB_USER ?? 'ashiba';
  const password = process.env.ASHIBA_TEST_DB_PASSWORD ?? 'ashiba';
  return `postgres://${user}:${password}@${host}:${port}/${name}`;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForDb(): Promise<void> {
  const timeoutMs = Number(process.env.ASHIBA_DB_WAIT_TIMEOUT_MS ?? DEFAULT_TIMEOUT_MS);
  const intervalMs = Number(process.env.ASHIBA_DB_WAIT_INTERVAL_MS ?? DEFAULT_INTERVAL_MS);
  const deadline = Date.now() + timeoutMs;
  let lastError: unknown;

  while (Date.now() <= deadline) {
    const pool = new Pool({ connectionString: resolveDatabaseUrl(), max: 1 });
    try {
      await pool.query('select 1');
      console.log('PostgreSQL is ready.');
      return;
    } catch (error) {
      lastError = error;
      await sleep(intervalMs);
    } finally {
      await pool.end().catch(() => undefined);
    }
  }

  const reason = lastError instanceof Error ? lastError.message : String(lastError);
  throw new Error(`PostgreSQL did not become ready within ${timeoutMs}ms: ${reason}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await waitForDb();
}
