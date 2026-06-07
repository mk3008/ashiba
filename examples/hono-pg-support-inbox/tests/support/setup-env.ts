import { config } from 'dotenv';

config();

const hasExplicitDbConfig = Boolean(
  process.env.ASHIBA_TEST_DATABASE_URL?.trim() ||
  process.env.ASHIBA_TEST_DB_HOST?.trim() ||
  process.env.ASHIBA_TEST_DB_PORT?.trim() ||
  process.env.ASHIBA_TEST_DB_NAME?.trim() ||
  process.env.ASHIBA_TEST_DB_USER?.trim() ||
  process.env.ASHIBA_TEST_DB_PASSWORD?.trim(),
);

if (!hasExplicitDbConfig) {
  process.env.ASHIBA_SKIP_DB_BACKED_TESTS = '1';
}

if (hasExplicitDbConfig) {
  const host = readDbEnv('ASHIBA_TEST_DB_HOST', 'localhost');
  const port = readDbEnv('ASHIBA_TEST_DB_PORT', '5432');
  const database = readDbEnv('ASHIBA_TEST_DB_NAME', 'ashiba');
  const user = readDbEnv('ASHIBA_TEST_DB_USER', 'ashiba');
  const password = readDbEnv('ASHIBA_TEST_DB_PASSWORD', 'ashiba');
  const derivedUrl = `postgres://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}:${port}/${encodeURIComponent(database)}`;

  if (process.env.ASHIBA_TEST_DATABASE_URL?.trim()) {
    const explicitUrl = process.env.ASHIBA_TEST_DATABASE_URL.trim();
    if (explicitUrl !== derivedUrl) {
      throw new Error([
        'ASHIBA_TEST_DATABASE_URL conflicts with the starter-owned DB settings.',
        'Use .env as the single source of truth for Ashiba test DB settings, or set ASHIBA_TEST_DATABASE_URL to the exact derived value.',
        `derived: ${derivedUrl}`,
        `explicit: ${explicitUrl}`,
      ].join('\n'));
    }
  } else {
    process.env.ASHIBA_TEST_DATABASE_URL = derivedUrl;
  }
}

function readDbEnv(name: string, fallback: string): string {
  const value = process.env[name]?.trim();
  if (value) return value;
  return fallback;
}
