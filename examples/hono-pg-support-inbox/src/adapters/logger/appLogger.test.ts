import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import { configureAppLogger, createLogPolicy, logApiRequest, logSqlExecution } from './appLogger.js';

const envKeys = [
  'ASHIBA_DEMO_LOG',
  'ASHIBA_DEMO_LOG_CONSOLE',
  'ASHIBA_DEMO_LOG_FILE',
  'ASHIBA_DEMO_LOG_PROFILE',
  'ASHIBA_DEMO_LOG_START_EVENTS',
  'ASHIBA_DEMO_LOG_API_EVENTS',
  'ASHIBA_DEMO_LOG_SQL_EVENTS',
  'ASHIBA_DEMO_SQL_LOG',
  'ASHIBA_DEMO_SQL_LOG_CONSOLE',
  'ASHIBA_DEMO_SQL_LOG_FILE',
  'ASHIBA_DEMO_SQL_LOG_PARAMS',
  'ASHIBA_DEMO_SQL_LOG_SQL_TEXT',
] as const;
const originalEnv = new Map<string, string | undefined>();
let tempDir: string;

beforeEach(() => {
  for (const key of envKeys) {
    originalEnv.set(key, process.env[key]);
    delete process.env[key];
  }
  tempDir = mkdtempSync(join(tmpdir(), 'ashiba-demo-log-'));
  process.env.ASHIBA_DEMO_LOG = '1';
  process.env.ASHIBA_DEMO_LOG_CONSOLE = '0';
  process.env.ASHIBA_DEMO_LOG_FILE = join(tempDir, 'app.log');
});

afterEach(() => {
  configureAppLogger();
  for (const key of envKeys) {
    const value = originalEnv.get(key);
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
  originalEnv.clear();
  rmSync(tempDir, { recursive: true, force: true });
});

describe('appLogger', () => {
  test('builds a profile policy with code-level overrides', () => {
    expect(createLogPolicy({
      profile: 'standard',
      overrides: {
        includeStartEvents: false,
        includeHashes: true,
      },
    })).toMatchObject({
      profile: 'standard',
      includeStartEvents: false,
      includeParameterNames: true,
      includeHashes: true,
      includeSqlText: false,
      includeParams: false,
    });
  });

  test('writes API and SQL events to one application log stream', () => {
    logApiRequest({
      phase: 'start',
      requestId: 'request-1',
      apiMethod: 'GET',
      apiPath: '/tickets',
      apiRoute: 'GET /tickets',
      operation: 'support-inbox.list',
    });
    logSqlExecution({
      phase: 'end',
      executionId: 'execution-1',
      metadata: {
        requestId: 'request-1',
        apiMethod: 'GET',
        apiPath: '/tickets',
        apiRoute: 'GET /tickets',
        operation: 'support-inbox.list',
        filterKeys: ['status'],
        sortKeys: ['updated_at.desc'],
        queryVariant: 'list',
        sqlId: 'list-tickets',
        queryId: 'list-tickets',
        sqlPath: 'list-tickets.sql',
      },
      orderedNames: ['status', 'limit'],
      elapsedMs: 12,
      rowCount: 2,
    });

    const events = readFileSync(process.env.ASHIBA_DEMO_LOG_FILE as string, 'utf8')
      .trim()
      .split('\n')
      .map((line) => JSON.parse(line) as Record<string, unknown>);

    expect(events).toHaveLength(2);
    expect(events[0]).toMatchObject({
      eventType: 'api_request',
      phase: 'start',
      requestId: 'request-1',
      apiRoute: 'GET /tickets',
    });
    expect(events[1]).toMatchObject({
      eventType: 'sql_execution',
      phase: 'end',
      requestId: 'request-1',
      apiRoute: 'GET /tickets',
      executionId: 'execution-1',
      sqlId: 'list-tickets',
      parameterSummary: [
        { name: 'status', placeholders: ['$1'], occurrenceCount: 1 },
        { name: 'limit', placeholders: ['$2'], occurrenceCount: 1 },
      ],
    });
    expect(events[1]).not.toHaveProperty('params');
    expect(events[1]).not.toHaveProperty('compiledSql');
  });

  test('trace profile records maximum local diagnostic detail', () => {
    process.env.ASHIBA_DEMO_LOG_PROFILE = 'trace';
    delete process.env.ASHIBA_DEMO_LOG;

    logSqlExecution({
      phase: 'end',
      executionId: 'execution-1',
      metadata: {
        requestId: 'request-1',
        apiMethod: 'GET',
        apiPath: '/tickets',
        apiRoute: 'GET /tickets',
        operation: 'support-inbox.list',
        filterKeys: ['status', 'keyword'],
        sortKeys: ['updated_at.desc'],
        queryVariant: 'list',
        queryModelSourceHash: 'sha256:source-model',
        queryModelStatementKind: 'select',
        queryModelRootQueryShape: 'simple-select',
        queryModelOptionalConditionCompression: true,
        queryModelSafeSortInsertionStatus: 'ready',
        sqlId: 'list-tickets',
        queryId: 'list-tickets',
        sqlPath: 'list-tickets.sql',
      },
      sourceSql: 'select * from tickets where status = :status',
      compiledSql: 'select * from tickets where status = $1',
      orderedNames: ['status'],
      params: ['waiting_customer'],
      maskedParams: ['<masked>'],
      elapsedMs: 12,
      rowCount: 2,
    });

    const [event] = readEvents();

    expect(event).toMatchObject({
      eventType: 'sql_execution',
      profile: 'trace',
      operation: 'support-inbox.list',
      filterKeys: ['status', 'keyword'],
      sortKeys: ['updated_at.desc'],
      queryVariant: 'list',
      queryModel: {
        sourceHash: 'sha256:source-model',
        statementKind: 'select',
        rootQueryShape: 'simple-select',
        optionalConditionCompression: true,
        safeSortInsertionStatus: 'ready',
      },
      sourceSql: 'select * from tickets where status = :status',
      compiledSql: 'select * from tickets where status = $1',
      params: ['waiting_customer'],
      maskedParams: ['<masked>'],
    });
    expect(event.sourceSqlHash).toMatch(/^sha256:/);
    expect(event.compiledSqlHash).toMatch(/^sha256:/);
  });

  test('minimal profile keeps only completion summaries by default', () => {
    process.env.ASHIBA_DEMO_LOG_PROFILE = 'minimal';
    delete process.env.ASHIBA_DEMO_LOG;

    logSqlExecution({
      phase: 'start',
      executionId: 'execution-1',
      metadata: { requestId: 'request-1', apiRoute: 'GET /tickets', sqlId: 'list-tickets' },
    });
    logSqlExecution({
      phase: 'end',
      executionId: 'execution-1',
      metadata: { requestId: 'request-1', apiRoute: 'GET /tickets', sqlId: 'list-tickets' },
      orderedNames: ['status'],
      elapsedMs: 12,
      rowCount: 2,
    });

    const events = readEvents();

    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      eventType: 'sql_execution',
      profile: 'minimal',
      phase: 'end',
      requestId: 'request-1',
      apiRoute: 'GET /tickets',
      sqlId: 'list-tickets',
      elapsedMs: 12,
      rowCount: 2,
    });
    expect(events[0]).not.toHaveProperty('parameterSummary');
    expect(events[0]).not.toHaveProperty('compiledSql');
    expect(events[0]).not.toHaveProperty('params');
  });

  test('code-level logger policy can override a preset without environment flags', () => {
    delete process.env.ASHIBA_DEMO_LOG;
    delete process.env.ASHIBA_DEMO_LOG_PROFILE;
    configureAppLogger({
      profile: 'minimal',
      overrides: {
        includeParameterNames: true,
      },
    });

    logSqlExecution({
      phase: 'end',
      executionId: 'execution-1',
      metadata: { requestId: 'request-1', apiRoute: 'GET /tickets', sqlId: 'list-tickets' },
      orderedNames: ['status'],
      sourceSql: 'select :status',
      compiledSql: 'select $1',
      params: ['waiting_customer'],
      elapsedMs: 12,
      rowCount: 2,
    });

    const [event] = readEvents();

    expect(event).toMatchObject({
      eventType: 'sql_execution',
      profile: 'minimal',
      parameterSummary: [
        { name: 'status', placeholders: ['$1'], occurrenceCount: 1 },
      ],
    });
    expect(event).not.toHaveProperty('sourceSqlHash');
    expect(event).not.toHaveProperty('compiledSqlHash');
    expect(event).not.toHaveProperty('sourceSql');
    expect(event).not.toHaveProperty('compiledSql');
    expect(event).not.toHaveProperty('params');
  });
});

function readEvents(): Record<string, unknown>[] {
  return readFileSync(process.env.ASHIBA_DEMO_LOG_FILE as string, 'utf8')
    .trim()
    .split('\n')
    .map((line) => JSON.parse(line) as Record<string, unknown>);
}
