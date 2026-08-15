import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, test } from 'vitest';

import { runAshibaCheck } from '../src/commands/check.js';
import {
  runFeatureGeneratedMapperCheck,
  runFeatureImport,
} from '../src/commands/feature.js';
import { runModelGen } from '../src/commands/model-gen.js';
import { buildQueryUsageReport, classifyImpactConfidence } from '../src/sqlgrep/query/report.js';
import type { QueryUsageMatchDetail } from '../src/sqlgrep/query/types.js';

describe('Raw SQL hardening gates', () => {
  test('binds inferred Params/Row and PostgreSQL arrays to one query contract without generated probes', () => {
    const fixture = createSearchFixture();
    try {
      const querySource = readFileSync(fixture.queryFile, 'utf8');
      const check = runFeatureGeneratedMapperCheck({
        rootDir: fixture.rootDir,
        feature: 'tickets-search',
        query: 'search',
      });

      expect(check.checked[0]).toMatchObject({
        sqlParameterTypes: { ticket_ids: 'number[]' },
        parameterTypeConflicts: [],
        warningParameterTypeConflicts: [],
      });
      expect(querySource).toContain('FeatureQuerySource<SearchQueryParams, SearchQueryResult>');
      expect(querySource).toContain('status: string | null;');
      expect(querySource).toContain('channel: string | null;');
      expect(querySource).toContain('priority: number;');
      expect(querySource).toContain('ticket_ids: number[];');
      expect(querySource).toContain('limit: number;');
      expect(querySource).toContain('offset: number;');
      expect(querySource).toContain('tags: string[];');
      expect(querySource).toContain('note: string | null;');
      expect(querySource).toContain('return queryMany(executor, searchQuery, params);');
      expect(querySource).not.toContain('as unknown as');
      expect(check.ok).toBe(true);
      expect(check.checked[0]?.parameterTypeConflicts).toEqual([]);
      expect(check.checked[0]?.warningParameterTypeConflicts).toEqual([]);
      expect(check.checked[0]?.sqlParameterTypes).toMatchObject({
        status: 'string | null',
        channel: 'string | null',
        priority: 'number',
        ticket_ids: 'number[]',
        limit: 'number',
        offset: 'number',
      });
      expect(check.checked[0]?.sqlResultTypes).toMatchObject({
        ticket_id: 'number',
        tags: 'string[]',
        note: 'string | null',
      });

      writeFileSync(
        fixture.queryFile,
        querySource
          .replace('ticket_ids: number[];', 'ticket_ids: string[];')
          .replace('tags: string[];', 'tags: string;'),
        'utf8',
      );
      const drift = runFeatureGeneratedMapperCheck({
        rootDir: fixture.rootDir,
        feature: 'tickets-search',
        query: 'search',
      });
      expect(drift.ok).toBe(false);
      expect(drift.checked[0]?.mismatchedParameterTypes).toContain(
        'ticket_ids: mapper string[] / SQL number[]',
      );
      expect(drift.checked[0]?.mismatchedResultTypes).toContain(
        'tags: mapper string / SQL string[]',
      );
    } finally {
      rmSync(fixture.rootDir, { recursive: true, force: true });
    }
  });

  test('detects rename and both directions of proved nullability change offline', () => {
    const renamed = createSearchFixture();
    const nonNullable = createSearchFixture();
    const nullable = createSearchFixture();
    const parameterTypeChanged = createSearchFixture();
    try {
      writeFileSync(
        renamed.ddlFile,
        readFileSync(renamed.ddlFile, 'utf8').replace('status text not null', 'state text not null'),
        'utf8',
      );
      const renameCheck = runFeatureGeneratedMapperCheck({
        rootDir: renamed.rootDir,
        feature: 'tickets-search',
        query: 'search',
      });
      expect(renameCheck.ok).toBe(false);
      expect(renameCheck.checked[0]?.mismatchedResultTypes).toContain(
        'status: mapper string / SQL unknown',
      );
      const renameLoop = runAshibaCheck({ rootDir: renamed.rootDir, fixGenerated: true });
      expect(renameLoop.generatedRefresh?.applicationOwnedIssues).toHaveLength(1);
      expect(renameLoop.generatedRefresh?.changedGeneratedFiles).toHaveLength(1);

      writeFileSync(
        nonNullable.ddlFile,
        readFileSync(nonNullable.ddlFile, 'utf8').replace('note text', 'note text not null'),
        'utf8',
      );
      const nullabilityCheck = runFeatureGeneratedMapperCheck({
        rootDir: nonNullable.rootDir,
        feature: 'tickets-search',
        query: 'search',
      });
      expect(nullabilityCheck.ok).toBe(false);
      expect(nullabilityCheck.checked[0]?.mismatchedResultTypes).toContain(
        'note: mapper string | null / SQL string',
      );
      const nullabilityLoop = runAshibaCheck({ rootDir: nonNullable.rootDir, fixGenerated: true });
      expect(nullabilityLoop.generatedRefresh?.applicationOwnedIssues).toHaveLength(1);
      expect(nullabilityLoop.generatedRefresh?.changedGeneratedFiles).toHaveLength(1);

      writeFileSync(
        nullable.ddlFile,
        readFileSync(nullable.ddlFile, 'utf8').replace('status text not null', 'status text'),
        'utf8',
      );
      const nullableCheck = runFeatureGeneratedMapperCheck({
        rootDir: nullable.rootDir,
        feature: 'tickets-search',
        query: 'search',
      });
      expect(nullableCheck.ok).toBe(false);
      expect(nullableCheck.checked[0]?.mismatchedResultTypes).toContain(
        'status: mapper string / SQL string | null',
      );

      writeFileSync(
        parameterTypeChanged.ddlFile,
        readFileSync(parameterTypeChanged.ddlFile, 'utf8').replace('status text not null', 'status integer not null'),
        'utf8',
      );
      const parameterTypeCheck = runFeatureGeneratedMapperCheck({
        rootDir: parameterTypeChanged.rootDir,
        feature: 'tickets-search',
        query: 'search',
      });
      expect(parameterTypeCheck.ok).toBe(false);
      expect(parameterTypeCheck.checked[0]?.mismatchedParameterTypes).toContain(
        'status: mapper string | null / SQL number | null',
      );
    } finally {
      rmSync(renamed.rootDir, { recursive: true, force: true });
      rmSync(nonNullable.rootDir, { recursive: true, force: true });
      rmSync(nullable.rootDir, { recursive: true, force: true });
      rmSync(parameterTypeChanged.rootDir, { recursive: true, force: true });
    }
  });

  test('refreshes generated artifacts in one command and lists application-owned projection work', () => {
    const fixture = createSearchFixture();
    const added = createSearchFixture();
    try {
      const queryBefore = readFileSync(fixture.queryFile, 'utf8');
      const sqlBefore = readFileSync(fixture.sqlFile, 'utf8');
      writeFileSync(fixture.sqlFile, sqlBefore.replace('    , t.note\n', ''), 'utf8');

      const result = runAshibaCheck({ rootDir: fixture.rootDir, fixGenerated: true });

      expect(result.ok).toBe(false);
      expect(readFileSync(fixture.queryFile, 'utf8')).toBe(queryBefore);
      expect(result.generatedRefresh?.changedGeneratedFiles).toEqual(expect.arrayContaining([
        'src/features/tickets-search/queries/search/generated/query.meta.ts',
        'src/features/tickets-search/queries/search/generated/query.sql.ts',
      ]));
      expect(result.generatedRefresh?.changedGeneratedFiles).toHaveLength(2);
      expect(result.generatedRefresh?.applicationOwnedIssues).toHaveLength(1);
      expect(result.generatedRefresh?.applicationOwnedIssues).toContain(
        'src/features/tickets-search/queries/search/query.ts: remove result column note; it is absent from visible SQL.',
      );
      expect(result.projectCheck.checks.contract?.mapperCheck.checked[0]?.unusedResultInMapper).toEqual(['note']);

      writeFileSync(
        added.sqlFile,
        readFileSync(added.sqlFile, 'utf8').replace('    , t.note\n', '    , t.note\n    , upper(t.status) as status_label\n'),
        'utf8',
      );
      const addResult = runAshibaCheck({ rootDir: added.rootDir, fixGenerated: true });
      expect(addResult.ok).toBe(false);
      expect(addResult.generatedRefresh?.applicationOwnedIssues).toContain(
        'src/features/tickets-search/queries/search/query.ts: add result column status_label projected by visible SQL.',
      );
      expect(addResult.generatedRefresh?.applicationOwnedIssues).toHaveLength(1);
      expect(addResult.generatedRefresh?.changedGeneratedFiles).toHaveLength(2);
      expect(addResult.projectCheck.checks.contract?.mapperCheck.checked[0]?.missingResultInMapper).toEqual(['status_label']);
    } finally {
      rmSync(fixture.rootDir, { recursive: true, force: true });
      rmSync(added.rootDir, { recursive: true, force: true });
    }
  });

  test('imports parser-unsupported valid PostgreSQL while blocking parser-dependent capabilities', () => {
    const rootDir = mkdtempSync(path.join(tmpdir(), 'ashiba-parser-degradation-'));
    try {
      mkdirSync(path.join(rootDir, 'tmp'), { recursive: true });
      writeFileSync(path.join(rootDir, 'tmp', 'fetch.sql'), [
        'select ticket_id',
        'from public.tickets',
        'order by ticket_id',
        'fetch first :limit rows with ties;',
        '',
      ].join('\n'), 'utf8');
      writeFileSync(path.join(rootDir, 'tmp', 'lock.sql'), [
        'select ticket_id',
        'from public.tickets',
        'for update skip locked;',
        '',
      ].join('\n'), 'utf8');

      const imported = runFeatureImport({
        rootDir,
        feature: 'tickets-fetch',
        queryName: 'fetch-page',
        sql: 'tmp/fetch.sql',
      });
      const lock = runModelGen({ rootDir, sqlFile: 'tmp/lock.sql' });
      const querySource = readFileSync(
        path.join(rootDir, 'src/features/tickets-fetch/queries/fetch-page/query.ts'),
        'utf8',
      );
      const queryMetadata = readFileSync(
        path.join(rootDir, 'src/features/tickets-fetch/queries/fetch-page/generated/query.meta.ts'),
        'utf8',
      );

      expect(imported.formatted).toBe(false);
      expect(imported.formatSkippedReason).toContain('SQL AST analysis degraded');
      expect(readFileSync(path.join(rootDir, imported.importedSqlFile), 'utf8')).toContain('with ties');
      expect(querySource).toContain('limit: number;');
      expect(querySource).toContain('[column: string]: unknown');
      expect(querySource).not.toContain('optionalConditionCompression: true');
      expect(queryMetadata).toContain('"execution": "unaffected"');
      expect(queryMetadata).toContain('"parameterBinding": "unaffected"');
      expect(queryMetadata).toContain('"optionalConditionCompression": "blocked"');
      expect(queryMetadata).toContain('"safeSort": "blocked"');
      expect(lock.analysis.astParse).toBe('failed');
      expect(lock.analysis.parserCapabilities).toMatchObject({
        execution: 'unaffected',
        parameterBinding: 'unaffected',
        resultContract: 'degraded',
        impactAnalysis: 'degraded',
      });
    } finally {
      rmSync(rootDir, { recursive: true, force: true });
    }
  });

  test('deduplicates discovered SQL ownership and returns stable impact identity and confidence bands', () => {
    const rootDir = mkdtempSync(path.join(tmpdir(), 'ashiba-impact-stable-'));
    try {
      const queryDir = path.join(rootDir, 'src/features/tickets-search/queries/search');
      mkdirSync(queryDir, { recursive: true });
      writeFileSync(path.join(queryDir, 'search.sql'), [
        'select t.ticket_id, t.status',
        'from public.tickets t',
        'where t.status = :status;',
        '',
      ].join('\n'), 'utf8');
      writeFileSync(path.join(queryDir, 'query.ts'), [
        "export const queryId = 'tickets.search';",
        "export const sqlFile = './search.sql';",
        'export const querySpec = { id: queryId, sqlFile, } as const;',
        '',
      ].join('\n'), 'utf8');
      writeFileSync(path.join(queryDir, 'tickets.presenter.ts'), [
        "export const presenter = { sqlPath: './search.sql' } as const;",
        '',
      ].join('\n'), 'utf8');

      const first = buildQueryUsageReport({
        rootDir,
        kind: 'column',
        rawTarget: 'public.tickets.status',
        view: 'impact',
      });
      const second = buildQueryUsageReport({
        rootDir,
        kind: 'column',
        rawTarget: 'public.tickets.status',
        view: 'impact',
      });

      expect(first).toEqual(second);
      expect(first.summary.catalogsScanned).toBe(1);
      expect(first.summary.statementsScanned).toBe(1);
      expect(first.matches).toHaveLength(1);
      expect(first.matches[0]).toMatchObject({
        kind: 'impact',
        catalog_id: 'tickets.search',
        query_id: 'tickets.search:1',
        sql_file: 'src/features/tickets-search/queries/search/search.sql',
        confidenceBand: expect.stringMatching(/^(high|low|unresolved)$/),
      });
      expect(first.matches.some((match) => match.catalog_id.includes('missing-id'))).toBe(false);
      expect(
        first.summary.highConfidenceMatches
        + first.summary.lowConfidenceMatches
        + first.summary.unresolvedMatches,
      ).toBe(first.matches.length);

      const lockDir = path.join(rootDir, 'src/features/tickets-lock/queries/claim');
      mkdirSync(lockDir, { recursive: true });
      writeFileSync(path.join(lockDir, 'claim.sql'), [
        'select t.ticket_id',
        'from public.tickets t',
        'for update skip locked;',
        '',
      ].join('\n'), 'utf8');
      writeFileSync(path.join(lockDir, 'query.ts'), [
        "export const queryId = 'tickets.claim';",
        "export const sqlFile = './claim.sql';",
        'export const querySpec = { id: queryId, sqlFile, } as const;',
        '',
      ].join('\n'), 'utf8');
      const mixed = buildQueryUsageReport({
        rootDir,
        kind: 'table',
        rawTarget: 'public.tickets',
        view: 'impact',
        allowParserFallback: true,
      });
      expect(mixed.summary).toMatchObject({
        catalogsScanned: 2,
        statementsScanned: 2,
        matches: 2,
        highConfidenceMatches: 1,
        lowConfidenceMatches: 1,
        unresolvedMatches: 0,
      });
      expect(mixed.matches.find((match) => match.catalog_id === 'tickets.claim')).toMatchObject({
        confidence: 'low',
        confidenceBand: 'low',
        source: 'fallback',
      });

      const unresolvedDetail: QueryUsageMatchDetail = {
        kind: 'detail',
        catalog_id: 'tickets.unresolved',
        query_id: 'tickets.unresolved:1',
        statement_fingerprint: 'sha256:unresolved',
        sql_file: 'src/features/tickets-unresolved/queries/read/read.sql',
        usage_kind: 'from',
        location: null,
        snippet: 'select * from public.tickets',
        confidence: 'low',
        notes: ['location-unresolved'],
        source: 'fallback',
      };
      expect(classifyImpactConfidence([unresolvedDetail])).toBe('unresolved');
    } finally {
      rmSync(rootDir, { recursive: true, force: true });
    }
  });
});

function createSearchFixture(): {
  rootDir: string;
  ddlFile: string;
  sqlFile: string;
  queryFile: string;
} {
  const rootDir = mkdtempSync(path.join(tmpdir(), 'ashiba-query-contract-'));
  const ddlFile = path.join(rootDir, 'db/ddl/public.sql');
  const sourceFile = path.join(rootDir, 'tmp/search.sql');
  mkdirSync(path.dirname(ddlFile), { recursive: true });
  mkdirSync(path.dirname(sourceFile), { recursive: true });
  writeFileSync(path.join(rootDir, 'ashiba.config.json'), JSON.stringify({
    featureRoot: 'src/features',
    sqlRoots: ['src/features'],
    ddl: { sourceDir: 'db/ddl' },
  }, null, 2), 'utf8');
  writeFileSync(ddlFile, [
    'create table public.tickets (',
    '  ticket_id integer primary key,',
    '  status text not null,',
    '  priority integer not null,',
    '  channel text not null,',
    '  tags text[] not null,',
    '  note text',
    ');',
    '',
  ].join('\n'), 'utf8');
  writeFileSync(sourceFile, [
    'select',
    '    t.ticket_id',
    '    , t.status',
    '    , t.priority',
    '    , t.tags',
    '    , t.note',
    'from public.tickets t',
    'where',
    '    (:status is null or t.status = :status)',
    '    and (cast(:channel as text) is null or t.channel = :channel)',
    '    and t.priority = :priority -- cast(:priority as integer) is null',
    '    and t.ticket_id = any(:ticket_ids::integer[])',
    'order by',
    '    t.priority desc',
    '    , t.ticket_id asc',
    'limit :limit',
    'offset :offset;',
    '',
  ].join('\n'), 'utf8');
  runFeatureImport({
    rootDir,
    feature: 'tickets-search',
    queryName: 'search',
    sql: 'tmp/search.sql',
  });
  const queryDir = path.join(rootDir, 'src/features/tickets-search/queries/search');
  return {
    rootDir,
    ddlFile,
    sqlFile: path.join(queryDir, 'search.sql'),
    queryFile: path.join(queryDir, 'query.ts'),
  };
}
