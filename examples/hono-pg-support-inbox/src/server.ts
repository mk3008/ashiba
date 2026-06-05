import 'dotenv/config';

import { serve } from '@hono/node-server';

import { createPgPool } from '#adapters/pg/pool.js';
import { createApp } from './app.js';

const port = Number(process.env.PORT ?? 3000);
const pool = createPgPool({
  connectionString: resolveDatabaseUrl(),
});
const app = createApp(pool);

serve({ fetch: app.fetch, port }, (info) => {
  console.log(`Support Inbox Demo is running at http://localhost:${info.port}/tickets`);
});

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
