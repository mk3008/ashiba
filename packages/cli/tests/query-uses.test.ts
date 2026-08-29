import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { describe, expect, test } from 'vitest';
import { buildQueryUsageReport } from '../src/sqlgrep/index.js';

function withCatalog(sql: string, run: (rootDir: string) => void): void {
  const rootDir = mkdtempSync(path.join(tmpdir(), 'ashiba-query-uses-'));
  try {
    writeFileSync(path.join(rootDir, 'orders.sql'), sql, 'utf8');
    writeFileSync(path.join(rootDir, 'orders.spec.json'), JSON.stringify({ id: 'orders', sqlFile: 'orders.sql' }), 'utf8');
    run(rootDir);
  } finally {
    rmSync(rootDir, { recursive: true, force: true });
  }
}

describe('query uses', () => {
  test('reports AST-backed table and column usage across discovered catalogs', () => {
    withCatalog('select o.id, o.status from public.orders o where o.status = :status', (rootDir) => {
      const table = buildQueryUsageReport({ kind: 'table', rawTarget: 'public.orders', rootDir });
      const column = buildQueryUsageReport({ kind: 'column', rawTarget: 'public.orders.status', rootDir });

      expect(table.summary.matches).toBe(1);
      expect(table.matches[0]).toMatchObject({ source: 'ast', confidenceBand: 'high' });
      expect(column.summary.matches).toBeGreaterThan(0);
      expect(column.matches[0]).toMatchObject({ source: 'ast' });
    });
  });

  test('fails closed for an AST parse failure by default', () => {
    withCatalog('select * from public.orders lateral nonsense', (rootDir) => {
      try {
        buildQueryUsageReport({ kind: 'table', rawTarget: 'public.orders', rootDir });
        throw new Error('Expected AST parse failure.');
      } catch (error) {
        expect(error).toMatchObject({ code: 'ASHIBA_QUERY_USES_AST_PARSE_FAILED' });
      }
    });
  });

  test('uses low-confidence fallback only when explicitly requested', () => {
    withCatalog('select * from public.orders lateral nonsense', (rootDir) => {
      const report = buildQueryUsageReport({
        kind: 'table',
        rawTarget: 'public.orders',
        rootDir,
        allowParserFallback: true,
      });

      expect(report.summary.parseWarnings).toBe(1);
      expect(report.summary.fallbackMatches).toBe(1);
      expect(report.matches[0]).toMatchObject({ source: 'fallback', confidenceBand: 'low' });
    });
  });
});
