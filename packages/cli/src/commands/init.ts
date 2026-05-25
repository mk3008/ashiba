import { mkdirSync, existsSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import type { Command } from 'commander';
import { invalidCliInputError } from '../errors.js';

type InitOptions = {
  dir?: string;
  force?: boolean;
  dryRun?: boolean;
  withDemoDdl?: boolean;
  withMigrationDemoDdl?: boolean;
};

type InitFile = {
  relativePath: string;
  contents: string;
};

export type InitResult = {
  rootDir: string;
  dryRun: boolean;
  files: Array<{
    relativePath: string;
    action: InitFileAction;
  }>;
};

type InitFileAction = 'create' | 'overwrite' | 'skip';

const forbiddenInitFileNames = new Set([
  'AGENTS.md',
  'AGENT.md',
  'SKILL.md',
]);

const starterFiles: InitFile[] = [
  {
    relativePath: 'README.md',
    contents: `# Show me the SQL.

Ashiba handles the boring parts.

This starter keeps SQL visible and puts DTO definitions, mappers, query IDs, and generated code where humans and AI agents can read, edit, test, and keep them.
Generated code is not hidden behind generate; keep it visible and drift-check it as the project grows.

Install Docker with PostgreSQL support before running the starter tests. Ashiba treats DB-backed unit tests as the normal path, not an optional afterthought.
Copy \`.env.example\` to \`.env\`, adjust \`ASHIBA_TEST_DATABASE_PORT\` if 5432 is already in use, then run \`docker compose up -d\`.
The generated Vitest setup derives \`ASHIBA_TEST_DATABASE_URL\` from that port unless you provide an explicit URL.

SQL should stay SQL and be directly runnable in a SQL client for debugging.
Do not dynamically rewrite SQL at runtime; the DB driver wrapper may use whitelisted sort profiles for sort conditions only.
Use mapper tests and DB-backed integration tests for type safety; do not add Ashiba runtime row validation overhead.
Use named parameters such as :name or @name in SQL; the DB driver wrapper owns conversion to driver placeholders.
Use Zero Table Dependency for mapper tests by default, and traditional DB-backed tests for performance tests.
Generated-folder unit-test schema files are library-owned; other generated code is editable by humans and AI agents.
Errors should be selectable for human-oriented or AI-oriented output with cause and next action when possible.

## Project Shape

- \`db/ddl\` keeps schema source files.
- \`src/features\` keeps feature-local SQL and boundaries.
- \`src/features/<feature>/queries/<query>\` keeps one query boundary.
- Migration query generation compares two DDL inputs and emits migration DDL plus risk info; DB connection and apply are application/operator responsibilities.
- Application code owns business SQL intent, connection lifecycle, and transaction policy.

## Runtime Policy

Ashiba Runtime Zero in CLI-generated application code. Thin driver adapter only where needed.

Ashiba Runtime Zero does not mean there is no database driver, driver adapter, or extension runtime. It means the CLI generates native TypeScript code and Ashiba CLI/runtime libraries are not required by CLI-generated application code.
That avoids forced security updates for an unused Ashiba runtime dependency. If generated code needs a fix, patch the local application code directly.
`,
  },
  {
    relativePath: 'package.json',
    contents: `${JSON.stringify({
      name: 'ashiba-starter',
      private: true,
      type: 'module',
      scripts: {
        test: 'vitest run',
        'test:mapper': 'vitest run "src/features/**/*.ztd.test.ts"',
        'test:evidence': 'ashiba test-evidence collect --out .ashiba/test-evidence.json',
      },
      dependencies: {
        '@ashiba/driver-adapter-pg': '^0.0.0',
        pg: '^8.16.3',
      },
      devDependencies: {
        '@ashiba/cli': '^0.0.0',
        '@rawsql-ts/testkit-postgres': '^0.16.0',
        '@types/pg': '^8.15.5',
        dotenv: '^16.6.1',
        vitest: '^4.1.7',
      },
    }, null, 2)}
`,
  },
  {
    relativePath: '.gitignore',
    contents: `node_modules/
dist/
coverage/
*.log

.env
.env.*
!.env.example
`,
  },
  {
    relativePath: '.env.example',
    contents: `# Copy this file to .env and adjust ASHIBA_TEST_DATABASE_PORT if 5432 is already in use.
# The generated Vitest setup derives ASHIBA_TEST_DATABASE_URL from this port.
ASHIBA_TEST_DATABASE_PORT=5432
`,
  },
  {
    relativePath: 'compose.yaml',
    contents: `# Starter Postgres environment for Ashiba tests.
# Start it with: docker compose up -d
# Copy .env.example to .env and update ASHIBA_TEST_DATABASE_PORT if 5432 is already in use.
# docker compose reads .env from the project root for variable substitution.

services:
  postgres:
    image: postgres:16
    network_mode: bridge
    environment:
      POSTGRES_DB: ashiba
      POSTGRES_PASSWORD: postgres
      POSTGRES_USER: postgres
    ports:
      - "\${ASHIBA_TEST_DATABASE_PORT:-5432}:5432"
`,
  },
  {
    relativePath: 'ashiba.config.json',
    contents: `${JSON.stringify({
      $schema: 'https://ashiba.dev/schema/ashiba-config.json',
      ddl: {
        sourceDir: 'db/ddl',
      },
      features: {
        sourceDir: 'src/features',
      },
      sql: {
        parameterStyle: 'both',
      },
      tests: {
        mapperLane: 'ztd',
        performanceLane: 'traditional',
      },
    }, null, 2)}
`,
  },
  {
    relativePath: 'vitest.config.ts',
    contents: `import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/features/**/*.test.ts'],
    environment: 'node',
    setupFiles: ['tests/support/setup-env.ts'],
    testTimeout: 60_000,
    hookTimeout: 60_000,
  },
});
`,
  },
  {
    relativePath: 'tests/support/setup-env.ts',
    contents: `import { config } from 'dotenv';

config();

if (!process.env.ASHIBA_TEST_DATABASE_URL) {
  const port = process.env.ASHIBA_TEST_DATABASE_PORT?.trim() || '5432';
  process.env.ASHIBA_TEST_DATABASE_URL = \`postgres://postgres:postgres@localhost:\${port}/ashiba\`;
}
`,
  },
  {
    relativePath: 'src/features/smoke/README.md',
    contents: `# smoke

Small starter feature that demonstrates visible SQL and a query boundary.

## Test Layout

- \`tests/smoke.boundary.test.ts\` is the feature-level traditional lane smoke check.
- \`queries/smoke/tests/smoke.boundary.ztd.test.ts\` is the query-local mapper lane executable ZTD check.
- \`queries/smoke/tests/generated/\` is library-owned and refreshable.
- \`queries/smoke/tests/cases/\` is human-owned and persistent.
`,
  },
  {
    relativePath: 'src/features/smoke/boundary.ts',
    contents: `export { smokeQuerySql } from './queries/smoke/boundary.js';
`,
  },
  {
    relativePath: 'src/features/smoke/queries/smoke/boundary.ts',
    contents: `import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const currentDir = dirname(fileURLToPath(import.meta.url));

export const smokeQuerySql = readFileSync(join(currentDir, 'smoke.sql'), 'utf8');

export type SmokeQueryParams = {
  user_id: number;
};

export type SmokeQueryResult = {
  user_id: number;
  email: string;
};

export type SmokeQueryExecutor = {
  query<T = unknown>(sql: string, params: Record<string, unknown>): Promise<T[]>;
};

export async function executeSmokeQuery(
  executor: SmokeQueryExecutor,
  params: SmokeQueryParams,
): Promise<SmokeQueryResult> {
  const rows = await executor.query<SmokeQueryResult>(smokeQuerySql, params);
  if (rows.length !== 1) {
    throw new Error(\`smoke query expected exactly one row, but got \${rows.length}.\`);
  }
  return rows[0]!;
}
`,
  },
  {
    relativePath: 'src/features/smoke/queries/smoke/smoke.sql',
    contents: `select
  user_id,
  email
from public.users
where user_id = :user_id;
`,
  },
  {
    relativePath: 'src/features/smoke/tests/smoke.boundary.test.ts',
    contents: `import { expect, test } from 'vitest';

import * as boundary from '../boundary.js';

test('smoke boundary exports executable query entry points', () => {
  expect(Object.keys(boundary).length).toBeGreaterThan(0);
});
`,
  },
  {
    relativePath: 'src/features/smoke/queries/smoke/tests/smoke.boundary.ztd.test.ts',
    contents: `import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, test } from 'vitest';

import { runQuerySpecZtdCases } from '../../../../../../tests/support/ztd/harness.js';
import { executeSmokeQuery } from '../boundary.js';
import cases from './cases/basic.case.js';

const shouldSkipZtd =
  process.env.ASHIBA_SKIP_DB_BACKED_TESTS === '1' ||
  !existsSync(resolve('db/ddl/public.sql'));

const testZtd = shouldSkipZtd ? test.skip : test;

testZtd('smoke/smoke boundary ZTD cases run through the fixed app-level harness', async () => {
  expect(cases.length).toBeGreaterThan(0);
  const evidence = await runQuerySpecZtdCases(cases, executeSmokeQuery);
  expect(evidence.every((entry) => entry.mode === 'ztd')).toBe(true);
  expect(evidence.every((entry) => entry.physicalSetupUsed === false)).toBe(true);
  expect(evidence.every((entry) => entry.executedQueryCount > 0)).toBe(true);
});
`,
  },
  {
    relativePath: 'src/features/smoke/queries/smoke/tests/boundary-ztd-types.ts',
    contents: `import type { QuerySpecZtdCase } from '../../../../../../tests/support/ztd/case-types.js';
import type { SmokeQueryParams, SmokeQueryResult } from '../boundary.js';

export type SmokeBeforeDb = {
  public: {
    users: readonly {
      user_id?: unknown;
      email?: unknown;
    }[];
  };
};

export type SmokeQueryBoundaryZtdCase = QuerySpecZtdCase<
  SmokeBeforeDb,
  SmokeQueryParams,
  SmokeQueryResult
>;
`,
  },
  {
    relativePath: 'src/features/smoke/queries/smoke/tests/cases/basic.case.ts',
    contents: `import type { SmokeQueryBoundaryZtdCase } from '../boundary-ztd-types.js';

const cases: readonly SmokeQueryBoundaryZtdCase[] = [
  {
    name: 'selects the starter users row by id',
    beforeDb: {
      public: {
        users: [
          {
            user_id: 1,
            email: 'alice@example.com',
          },
          {
            user_id: 2,
            email: 'bob@example.com',
          },
        ],
      },
    },
    input: { user_id: 1 },
    output: { user_id: 1, email: 'alice@example.com' },
  },
];

export default cases;
`,
  },
  {
    relativePath: 'src/features/smoke/queries/smoke/tests/cases/.gitkeep',
    contents: '',
  },
  {
    relativePath: 'tests/support/ztd/case-types.ts',
    contents: `export interface QuerySpecZtdCase<
  BeforeDb extends Record<string, unknown> = Record<string, unknown>,
  Input = unknown,
  Output = unknown,
> {
  name: string;
  beforeDb: BeforeDb;
  input: Input;
  output: Output;
}
`,
  },
  {
    relativePath: 'tests/support/ztd/harness.ts',
    contents: `import type { QuerySpecZtdCase } from './case-types.js';
import { verifyQuerySpecZtdCase, type QuerySpecExecutionEvidence } from './verifier.js';

export type QuerySpecExecutorClient = {
  query<T = unknown>(sql: string, params: Record<string, unknown>): Promise<T[]>;
};

type QuerySpecExecutor<Input, Output> = (
  client: QuerySpecExecutorClient,
  input: Input,
) => Promise<Output>;

export async function runQuerySpecZtdCases<
  BeforeDb extends Record<string, unknown>,
  Input,
  Output,
>(
  cases: readonly QuerySpecZtdCase<BeforeDb, Input, Output>[],
  execute: QuerySpecExecutor<Input, Output>,
): Promise<QuerySpecExecutionEvidence[]> {
  const evidence: QuerySpecExecutionEvidence[] = [];
  for (const querySpecCase of cases) {
    evidence.push(await verifyQuerySpecZtdCase(querySpecCase, execute));
  }
  return evidence;
}
`,
  },
  {
    relativePath: 'tests/support/ztd/verifier.ts',
    contents: `import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { expect } from 'vitest';
import { Pool } from 'pg';
import type { PostgresTestkitClient } from '@rawsql-ts/testkit-postgres';

import type { QuerySpecZtdCase } from './case-types.js';
import type { QuerySpecExecutorClient } from './harness.js';

type FixtureTree = Record<string, unknown>;
type FixtureRow = Record<string, unknown>;
type FixtureTableRows = Array<{ tableName: string; rows: FixtureRow[] }>;

type QuerySpecExecutor<Input, Output> = (
  client: QuerySpecExecutorClient,
  input: Input,
) => Promise<Output>;

export interface QuerySpecExecutionEvidence {
  mode: 'ztd';
  rewriteApplied: boolean;
  physicalSetupUsed: boolean;
  executedQueryCount: number;
}

type QueryExecutionTrace = {
  originalSql: string;
  boundSql: string;
  boundParams: unknown[];
  rewriteApplied: boolean;
};

export async function verifyQuerySpecZtdCase<BeforeDb extends FixtureTree, Input, Output>(
  querySpecCase: QuerySpecZtdCase<BeforeDb, Input, Output>,
  execute: QuerySpecExecutor<Input, Output>,
): Promise<QuerySpecExecutionEvidence> {
  const connectionString = process.env.ASHIBA_TEST_DATABASE_URL;
  if (!connectionString) {
    throw new Error('Set ASHIBA_TEST_DATABASE_URL before running Ashiba ZTD cases.');
  }

  const tableRows = flattenFixtureTableRows(querySpecCase.beforeDb);
  const trace: QueryExecutionTrace[] = [];
  const defaults = loadStarterDefaults(process.cwd());
  let pool: Pool | undefined;
  let testkitClient: PostgresTestkitClient | undefined;

  try {
    pool = new Pool({ connectionString });
    const { createPostgresTestkitClient } = await import('@rawsql-ts/testkit-postgres');
    testkitClient = createPostgresTestkitClient({
      queryExecutor: async (sql, params) => {
        const result = await pool!.query(sql, params as unknown[]);
        return {
          rows: result.rows,
          rowCount: result.rowCount ?? undefined,
        };
      },
      defaultSchema: defaults.defaultSchema,
      searchPath: defaults.searchPath,
      tableRows,
      ddl: defaults.ddlDirectories.length > 0 ? { directories: defaults.ddlDirectories } : undefined,
      onExecute: (sql, _params, fixtures) => {
        const latestTrace = trace[trace.length - 1];
        if (!latestTrace) return;
        latestTrace.rewriteApplied =
          normalizeSql(latestTrace.boundSql) !== normalizeSql(sql) || (fixtures?.length ?? 0) > 0;
      },
    });

    const result = execute(createQuerySpecExecutor(testkitClient, trace), querySpecCase.input);
    await expect(result).resolves.toEqual(querySpecCase.output);
    if (trace.length === 0) {
      throw new Error(\`ZTD verifier did not execute any SQL for case "\${querySpecCase.name}".\`);
    }
  } finally {
    if (testkitClient) await testkitClient.close();
    if (pool) await pool.end();
  }

  return {
    mode: 'ztd',
    rewriteApplied: trace.some((entry) => entry.rewriteApplied),
    physicalSetupUsed: false,
    executedQueryCount: trace.length,
  };
}

function createQuerySpecExecutor(
  testkitClient: PostgresTestkitClient,
  trace: QueryExecutionTrace[],
): QuerySpecExecutorClient {
  return {
    async query<T = unknown>(sql: string, params: Record<string, unknown>): Promise<T[]> {
      const bound = bindNamedParams(sql, params);
      trace.push({
        originalSql: sql,
        boundSql: bound.boundSql,
        boundParams: bound.boundValues,
        rewriteApplied: false,
      });
      const result = await testkitClient.query(bound.boundSql, bound.boundValues);
      return result.rows as T[];
    },
  };
}

function loadStarterDefaults(rootDir: string): {
  defaultSchema: string;
  searchPath: string[];
  ddlDirectories: string[];
} {
  const configPath = path.join(rootDir, 'ashiba.config.json');
  const config = existsSync(configPath)
    ? JSON.parse(readFileSync(configPath, 'utf8')) as {
        ddl?: { sourceDir?: unknown };
        defaultSchema?: unknown;
        searchPath?: unknown;
      }
    : {};
  const defaultSchema = typeof config.defaultSchema === 'string' && config.defaultSchema
    ? config.defaultSchema
    : 'public';
  const searchPath = Array.isArray(config.searchPath)
    ? config.searchPath.filter((entry): entry is string => typeof entry === 'string' && entry.length > 0)
    : [defaultSchema];
  const sourceDir = typeof config.ddl?.sourceDir === 'string' && config.ddl.sourceDir
    ? config.ddl.sourceDir
    : 'db/ddl';
  const ddlDirectory = path.resolve(rootDir, sourceDir);

  return {
    defaultSchema,
    searchPath,
    ddlDirectories: existsSync(ddlDirectory) ? [ddlDirectory] : [],
  };
}

function flattenFixtureTableRows(
  fixture: FixtureTree,
  pathSegments: string[] = [],
): FixtureTableRows {
  const tableRows: FixtureTableRows = [];

  for (const [key, value] of Object.entries(fixture)) {
    const nextPathSegments = [...pathSegments, key];
    if (Array.isArray(value)) {
      tableRows.push({
        tableName: nextPathSegments.join('.'),
        rows: value.map((row) => assertRecordRow(row, nextPathSegments.join('.'))),
      });
      continue;
    }

    if (isPlainRecord(value)) {
      tableRows.push(...flattenFixtureTableRows(value, nextPathSegments));
      continue;
    }

    throw new Error(\`ZTD fixture entry \${nextPathSegments.join('.')} must be an object or an array of rows.\`);
  }

  return tableRows;
}

function assertRecordRow(value: unknown, tableName: string): Record<string, unknown> {
  if (isPlainRecord(value)) return value;
  throw new Error(\`ZTD fixture rows for \${tableName} must be objects.\`);
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function normalizeSql(sql: string): string {
  return sql.replace(/\\s+/g, ' ').trim();
}

type BoundNamedSql = {
  boundSql: string;
  boundValues: unknown[];
};

function bindNamedParams(sql: string, params: Record<string, unknown>): BoundNamedSql {
  const tokens = scanNamedParams(sql);
  const boundValues: unknown[] = [];
  const slotByName = new Map<string, number>();
  let cursor = 0;
  let boundSql = '';

  for (const token of tokens) {
    boundSql += sql.slice(cursor, token.start);
    let slot = slotByName.get(token.name);
    if (!slot) {
      if (!(token.name in params)) {
        throw new Error(\`Missing named query param: \${token.name}\`);
      }
      boundValues.push(params[token.name]);
      slot = boundValues.length;
      slotByName.set(token.name, slot);
    }
    boundSql += \`$\${slot}\`;
    cursor = token.end;
  }

  boundSql += sql.slice(cursor);
  return { boundSql, boundValues };
}

type NamedToken = {
  start: number;
  end: number;
  name: string;
};

function scanNamedParams(sql: string): NamedToken[] {
  const tokens: NamedToken[] = [];
  let index = 0;

  while (index < sql.length) {
    const current = sql[index];
    const next = sql[index + 1] ?? '';
    if (current === '\\'' || current === '"') {
      index = skipQuoted(sql, index, current);
      continue;
    }
    if (current === '-' && next === '-') {
      index = sql.indexOf('\\n', index + 2);
      if (index < 0) return tokens;
      continue;
    }
    if (current === '/' && next === '*') {
      const end = sql.indexOf('*/', index + 2);
      index = end >= 0 ? end + 2 : sql.length;
      continue;
    }
    if (current === ':' && next !== ':' && /[A-Za-z_]/.test(next)) {
      const end = consumeIdentifier(sql, index + 1);
      tokens.push({ start: index, end, name: sql.slice(index + 1, end) });
      index = end;
      continue;
    }
    index += 1;
  }

  return tokens;
}

function skipQuoted(sql: string, start: number, quote: string): number {
  let index = start + 1;
  while (index < sql.length) {
    if (sql[index] === quote && sql[index + 1] === quote) {
      index += 2;
      continue;
    }
    if (sql[index] === quote) return index + 1;
    index += 1;
  }
  return sql.length;
}

function consumeIdentifier(sql: string, start: number): number {
  let index = start;
  while (index < sql.length && /[A-Za-z0-9_]/.test(sql[index] ?? '')) {
    index += 1;
  }
  return index;
}
`,
  },
  {
    relativePath: 'src/features/smoke/queries/smoke/tests/generated/TEST_PLAN.md',
    contents: `# smoke/smoke Test Plan

This generated file is library-owned and may be refreshed by Ashiba.

- Mapper tests: prefer Zero Table Dependency.
- Performance tests: prefer traditional DB-backed tests.
- Keep human-authored cases under \`cases/\`.
`,
  },
  {
    relativePath: 'src/features/smoke/queries/smoke/tests/generated/analysis.json',
    contents: `${JSON.stringify({ feature: 'smoke', query: 'smoke', status: 'generated' }, null, 2)}
`,
  },
  {
    relativePath: 'docs/migration/status.md',
    contents: `# Migration Status

This starter was created by \`ashiba init\`.

## Current State

- Visible SQL starter exists.
- Demo DDL is optional. Re-run \`ashiba init --with-demo-ddl --force\` if you want the tutorial DDL files.
- Feature/query boundary starter exists.
- Mapper and traditional test lane smoke checks exist.
- Query-local generated test plan exists and is library-owned.

## Next Steps

- Add application-owned database wiring.
- Replace starter sample cases with project-specific mapper and feature cases when the query contract is ready.
- Run \`ashiba test-evidence collect\` to inspect mapper/performance lane evidence.
- Keep SQL visible and reviewable.
`,
  },
];

const demoDdlFiles: InitFile[] = [
  {
    relativePath: 'db/ddl/public.sql',
    contents: `create table public.users (
  user_id integer primary key,
  email text not null
);
`,
  },
];

const migrationDemoDdlFiles: InitFile[] = [
  {
    relativePath: 'tmp/ddl/production.sql',
    contents: `create table public.users (
  user_id integer primary key
);
`,
  },
];

for (const file of [...starterFiles, ...demoDdlFiles, ...migrationDemoDdlFiles]) {
  const fileName = path.basename(file.relativePath);
  const normalizedRelativePath = file.relativePath.replace(/\\/g, '/');
  if (
    forbiddenInitFileNames.has(fileName) ||
    normalizedRelativePath.startsWith('.agent/') ||
    normalizedRelativePath.startsWith('.agents/') ||
    normalizedRelativePath.startsWith('.codex/') ||
    normalizedRelativePath.includes('/skills/') ||
    normalizedRelativePath.includes('/prompts/') ||
    normalizedRelativePath.includes('/hooks/')
  ) {
    throw invalidCliInputError(
      'ASHIBA_INIT_FORBIDDEN_AI_BEHAVIOR_FILE',
      `Ashiba must not distribute AI behavior files: ${file.relativePath}`,
      'Remove the forbidden AI behavior file from the starter file list; Ashiba init may distribute ordinary README/docs, but not agent instruction files.',
      { file: file.relativePath },
    );
  }
}

export function registerInitCommand(program: Command): void {
  program
    .command('init')
    .description('Create a small Ashiba SQL-first starter')
    .option('--dir <path>', 'Target directory for the starter', '.')
    .option('--with-demo-ddl', 'Create demo DDL under db/ddl for the starter feature flow', false)
    .option('--with-migration-demo-ddl', 'Create a temporary old DDL snapshot under tmp/ddl for migration tutorial flow', false)
    .option('--force', 'Overwrite starter-owned files when they already exist', false)
    .option('--dry-run', 'Print the files that would be created without writing them', false)
    .action((options: InitOptions) => {
      const result = runInit(options);
      const title = result.dryRun ? 'Ashiba init plan' : 'Ashiba starter created';
      const lines = [
        `${title}: ${result.rootDir}`,
        '',
        ...result.files.map((file) => `- ${file.action}: ${file.relativePath}`),
      ];
      process.stdout.write(`${lines.join('\n')}\n`);
    });
}

export function runInit(options: InitOptions = {}): InitResult {
  const rootDir = path.resolve(options.dir ?? '.');
  const force = options.force === true;
  const dryRun = options.dryRun === true;
  const filesToWrite = [
    ...starterFiles,
    ...(options.withDemoDdl === true ? demoDdlFiles : []),
    ...(options.withMigrationDemoDdl === true ? migrationDemoDdlFiles : []),
  ];

  const files = filesToWrite.map((file) => {
    const destination = path.join(rootDir, file.relativePath);
    const exists = existsSync(destination);
    const action: InitFileAction = exists ? (force ? 'overwrite' : 'skip') : 'create';

    if (!dryRun && action !== 'skip') {
      mkdirSync(path.dirname(destination), { recursive: true });
      writeFileSync(destination, file.contents, 'utf8');
    }

    return {
      relativePath: file.relativePath,
      action,
    };
  });

  return {
    rootDir,
    dryRun,
    files,
  };
}
