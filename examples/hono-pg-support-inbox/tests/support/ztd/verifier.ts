import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { expect } from 'vitest';
import { Pool } from 'pg';
import type { FeatureQueryExecutor } from '@ashiba-ts/driver-adapter-core';
import type { PostgresTestkitClient } from '@ashiba-ts/testkit-adapter-pg';

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

export interface QuerySpecZtdVerifier {
  verify<BeforeDb extends FixtureTree, Input, Output>(
    querySpecCase: QuerySpecZtdCase<BeforeDb, Input, Output>,
    execute: QuerySpecExecutor<Input, Output>,
  ): Promise<QuerySpecExecutionEvidence>;
  close(): Promise<void>;
}

export async function createQuerySpecZtdVerifier(): Promise<QuerySpecZtdVerifier> {
  const connectionString = process.env.ASHIBA_TEST_DATABASE_URL;
  if (!connectionString) {
    throw new Error('Set ASHIBA_TEST_DATABASE_URL before running Ashiba ZTD cases.');
  }

  const defaults = loadStarterDefaults(process.cwd());
  const pool = new Pool({ connectionString });
  const { createPostgresTestkitClient } = await import('@ashiba-ts/testkit-adapter-pg');

  return {
    async verify<BeforeDb extends FixtureTree, Input, Output>(
      querySpecCase: QuerySpecZtdCase<BeforeDb, Input, Output>,
      execute: QuerySpecExecutor<Input, Output>,
    ): Promise<QuerySpecExecutionEvidence> {
      const tableRows = flattenFixtureTableRows(querySpecCase.beforeDb);
      const trace: QueryExecutionTrace[] = [];
      let testkitClient: PostgresTestkitClient | undefined;

      try {
        testkitClient = createPostgresTestkitClient({
          queryExecutor: async (sql, params) => {
            const result = await pool.query(sql, params as unknown[]);
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

        const actual = await execute(createQuerySpecExecutor(testkitClient, trace, querySpecCase), querySpecCase.input);
        expect(normalizeActualByExpected(actual, querySpecCase.output)).toEqual(querySpecCase.output);
        if (trace.length === 0) {
          throw new Error(`ZTD verifier did not execute any SQL for case "${querySpecCase.name}".`);
        }
      } finally {
        if (testkitClient) await testkitClient.close();
      }

      return {
        mode: 'ztd',
        rewriteApplied: trace.some((entry) => entry.rewriteApplied),
        physicalSetupUsed: false,
        executedQueryCount: trace.length,
      };
    },
    async close(): Promise<void> {
      await pool.end();
    },
  };
}

export async function verifyQuerySpecZtdCase<BeforeDb extends FixtureTree, Input, Output>(
  querySpecCase: QuerySpecZtdCase<BeforeDb, Input, Output>,
  execute: QuerySpecExecutor<Input, Output>,
): Promise<QuerySpecExecutionEvidence> {
  const verifier = await createQuerySpecZtdVerifier();
  try {
    return await verifier.verify(querySpecCase, execute);
  } finally {
    await verifier.close();
  }
}

function createQuerySpecExecutor(
  testkitClient: PostgresTestkitClient,
  trace: QueryExecutionTrace[],
  querySpecCase: QuerySpecZtdCase<FixtureTree, unknown, unknown>,
): QuerySpecExecutorClient {
  return {
    async query(query: Parameters<FeatureQueryExecutor['query']>[0], params: Parameters<FeatureQueryExecutor['query']>[1]) {
      const sourceSql = querySpecCase.mapperProbe?.sql ?? query.sql;
      const sourceParams = querySpecCase.mapperProbe?.params ?? params;
      const bound = bindNamedParams(sourceSql, sourceParams);
      trace.push({
        originalSql: sourceSql,
        boundSql: bound.boundSql,
        boundParams: bound.boundValues,
        rewriteApplied: false,
      });
      const result = await testkitClient.query(bound.boundSql, bound.boundValues);
      return result.rows;
    },
  };
}

function normalizeActualByExpected(actual: unknown, expected: unknown): unknown {
  if (Array.isArray(actual) && Array.isArray(expected)) {
    return actual.map((entry, index) => normalizeActualByExpected(entry, expected[index]));
  }
  if (isPlainRecord(actual) && isPlainRecord(expected)) {
    return Object.fromEntries(Object.entries(actual).map(([key, value]) => [
      key,
      normalizeActualByExpected(value, expected[key]),
    ]));
  }
  if (typeof expected === 'number' && typeof actual === 'string' && actual.trim() !== '') {
    const next = Number(actual);
    return Number.isFinite(next) ? next : actual;
  }
  if (typeof expected === 'string' && typeof actual === 'number') {
    return String(actual);
  }
  if (typeof expected === 'string' && actual instanceof Date) {
    return actual.toISOString();
  }
  if (typeof expected === 'boolean' && typeof actual === 'string') {
    const normalized = actual.toLowerCase();
    if (normalized === 'true') return true;
    if (normalized === 'false') return false;
  }
  if (typeof expected === 'string' && typeof actual === 'boolean') {
    return String(actual);
  }
  return actual;
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

    throw new Error(`ZTD fixture entry ${nextPathSegments.join('.')} must be an object or an array of rows.`);
  }

  return tableRows;
}

function assertRecordRow(value: unknown, tableName: string): Record<string, unknown> {
  if (isPlainRecord(value)) return value;
  throw new Error(`ZTD fixture rows for ${tableName} must be objects.`);
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return Object.prototype.toString.call(value) === '[object Object]';
}

function normalizeSql(sql: string): string {
  return sql.replace(/\s+/g, ' ').trim();
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
        throw new Error(`Missing named query param: ${token.name}`);
      }
      boundValues.push(params[token.name]);
      slot = boundValues.length;
      slotByName.set(token.name, slot);
    }
    boundSql += `$${slot}`;
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
    if (current === '\'' || current === '"') {
      index = skipQuoted(sql, index, current);
      continue;
    }
    if (current === '$') {
      const nextIndex = skipDollarQuoted(sql, index);
      if (nextIndex !== index) {
        index = nextIndex;
        continue;
      }
    }
    if (current === '-' && next === '-') {
      index = sql.indexOf('\n', index + 2);
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

function skipDollarQuoted(sql: string, start: number): number {
  const tag = sql.slice(start).match(/^(\$\$|\$[A-Za-z_][A-Za-z0-9_]*\$)/)?.[0];
  if (!tag) return start;
  const close = sql.indexOf(tag, start + tag.length);
  return close < 0 ? sql.length : close + tag.length;
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
