const variable = [
  'ASHIBA_TEST_DATABASE_URL',
  'ASHIBA_POSTGRES_DATABASE_URL',
].find((name) => typeof process.env[name] === 'string' && process.env[name].trim().length > 0);

if (!variable) {
  process.stderr.write([
    'PostgreSQL live verification requires an explicit database URL.',
    'Set ASHIBA_TEST_DATABASE_URL or ASHIBA_POSTGRES_DATABASE_URL, then rerun pnpm verify:postgres-live.',
    'The live suites remain skippable inside ordinary workspace tests; the explicit live gate must not pass by skipping every test.',
    '',
  ].join('\n'));
  process.exit(1);
}

process.stdout.write(`PostgreSQL live verification URL: ${variable}\n`);
