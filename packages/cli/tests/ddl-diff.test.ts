import { describe, expect, it } from 'vitest';
import { analyzeMigrationSqlRisks, AshibaDdlDiffError, compareDdlSql } from '../src/ddl-diff/index.js';

describe('analyzeMigrationSqlRisks', () => {
  it('reports destructive risks copied from the ztd-cli DDL risk contract', () => {
    const result = analyzeMigrationSqlRisks('DROP TABLE IF EXISTS public.users CASCADE;');

    expect(result.destructiveRisks.map((risk) => risk.kind)).toEqual(['cascade_drop', 'drop_table']);
    expect(result.destructiveRisks[0]?.guidance).toContain('review_if_required');
    expect(result.destructiveRisks[0]?.guidance).not.toContain('cli_option_not_exposed');
  });

  it('reports rebuild operational risks', () => {
    const result = analyzeMigrationSqlRisks(`
      DROP TABLE public.users;
      CREATE TABLE public.users (id integer not null primary key);
    `);

    expect(result.operationalRisks.map((risk) => risk.kind)).toEqual(['full_table_copy', 'table_rebuild']);
    expect(result.destructiveRisks.some((risk) => risk.kind === 'semantic_constraint_change')).toBe(true);
  });

  it('throws structured parse errors for unsupported migration SQL', () => {
    expect(() => analyzeMigrationSqlRisks('ALTER TABLE')).toThrow(AshibaDdlDiffError);
    try {
      analyzeMigrationSqlRisks('ALTER TABLE');
      throw new Error('expected analyzeMigrationSqlRisks to fail');
    } catch (error) {
      expect(error).toMatchObject({
        code: 'ASHIBA_DDL_RISK_AST_PARSE_FAILED',
        causeText: expect.stringContaining('DDL AST parsing failed while analyzing migration SQL risks.'),
        nextAction: expect.stringContaining('rawsql-ts'),
      });
    }
  });
});

describe('compareDdlSql', () => {
  it('creates a table apply plan when the local snapshot has a new table', () => {
    const result = compareDdlSql({
      localSql: 'CREATE TABLE public.users (id integer not null, name text);',
      remoteSql: '',
    });

    expect(result.hasChanges).toBe(true);
    expect(result.summary).toMatchObject([{ changeKind: 'create_table', schema: 'public', table: 'users' }]);
    expect(result.sql.toLowerCase()).toContain('create table');
  });

  it('reports drop column risks for changed table definitions without forcing a table rebuild', () => {
    const result = compareDdlSql({
      localSql: 'CREATE TABLE public.users (id integer not null);',
      remoteSql: 'CREATE TABLE public.users (id integer not null, old_name text);',
    });

    expect(result.summary.some((entry) => entry.changeKind === 'drop_column')).toBe(true);
    expect(result.risks.destructiveRisks.some((risk) => risk.kind === 'drop_column')).toBe(true);
    expect(result.risks.operationalRisks.some((risk) => risk.kind === 'table_rebuild')).toBe(false);
  });

  it('keeps destructive risks visible when destructive SQL output is suppressed', () => {
    const result = compareDdlSql({
      localSql: 'CREATE TABLE public.users (id integer not null);',
      remoteSql: 'CREATE TABLE public.users (id integer not null, old_name text);',
      safety: { dropColumns: false },
    });

    expect(result.sql).not.toContain('DROP COLUMN');
    expect(result.summary.some((entry) => entry.changeKind === 'drop_column')).toBe(true);
    expect(result.risks.destructiveRisks).toEqual(expect.arrayContaining([
      expect.objectContaining({
        kind: 'drop_column',
        target: 'public.users.old_name',
      }),
    ]));
  });
});
