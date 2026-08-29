import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { describe, expect, test } from 'vitest';
import { runLint } from '../src/commands/lint.js';

function withDdl(sql: string, run: (rootDir: string) => void): void {
  const rootDir = mkdtempSync(path.join(tmpdir(), 'ashiba-ddl-lint-'));
  try {
    const ddlDir = path.join(rootDir, 'db', 'ddl');
    mkdirSync(ddlDir, { recursive: true });
    writeFileSync(path.join(ddlDir, 'orders.sql'), 'create table public.orders (id integer, active boolean);', 'utf8');
    writeFileSync(path.join(rootDir, 'query.sql'), sql, 'utf8');
    run(rootDir);
  } finally {
    rmSync(rootDir, { recursive: true, force: true });
  }
}

describe('DDL-backed lint', () => {
  test('detects missing table and column references from the explicit DDL model', () => {
    withDdl('select o.missing_column from public.missing_table o', (rootDir) => {
      const result = runLint('query.sql', { rootDir, ddlDir: 'db/ddl' });

      expect(result.ok).toBe(false);
      expect(result.files[0]?.ddlIssues.map((issue) => issue.code)).toContain('ddl-missing-table');
    });

    withDdl('select o.missing_column from public.orders o', (rootDir) => {
      const result = runLint('query.sql', { rootDir, ddlDir: 'db/ddl' });

      expect(result.ok).toBe(false);
      expect(result.files[0]?.ddlIssues.map((issue) => issue.code)).toContain('ddl-missing-column');
    });
  });

  test('detects an obvious literal type mismatch without interpreting parameter semantics', () => {
    withDdl("insert into public.orders (id, active) values ('not-a-number', 'not-a-boolean')", (rootDir) => {
      const result = runLint('query.sql', { rootDir, ddlDir: 'db/ddl' });

      expect(result.files[0]?.ddlIssues.map((issue) => issue.code)).toEqual([
        'ddl-insert-type-mismatch',
        'ddl-insert-type-mismatch',
      ]);
      expect(result.files[0]?.output).not.toContain('parameter');
    });
  });

  test('fails closed when no DDL model is available', () => {
    const rootDir = mkdtempSync(path.join(tmpdir(), 'ashiba-ddl-lint-'));
    try {
      writeFileSync(path.join(rootDir, 'query.sql'), 'select 1', 'utf8');

      expect(() => runLint('query.sql', { rootDir })).toThrow(/DDL-backed lint requires an available DDL model/);
      try {
        runLint('query.sql', { rootDir });
      } catch (error) {
        expect(error).toMatchObject({ code: 'ASHIBA_LINT_DDL_MODEL_UNAVAILABLE' });
      }
    } finally {
      rmSync(rootDir, { recursive: true, force: true });
    }
  });

  test('fails closed when configured DDL source directory is missing', () => {
    const rootDir = mkdtempSync(path.join(tmpdir(), 'ashiba-ddl-lint-'));
    try {
      writeFileSync(path.join(rootDir, 'query.sql'), 'select 1', 'utf8');
      writeFileSync(path.join(rootDir, 'ashiba.config.json'), JSON.stringify({ ddl: { sourceDir: 'missing-ddl' } }), 'utf8');

      try {
        runLint('query.sql', { rootDir });
        throw new Error('Expected unavailable DDL model failure.');
      } catch (error) {
        expect(error).toMatchObject({
          code: 'ASHIBA_LINT_DDL_MODEL_UNAVAILABLE',
          nextAction: expect.stringContaining('Pass --ddl-dir <path>'),
        });
      }
    } finally {
      rmSync(rootDir, { recursive: true, force: true });
    }
  });
});
