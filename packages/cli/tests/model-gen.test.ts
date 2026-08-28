import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { describe, expect, test } from 'vitest';
import { runModelGen } from '../src/commands/model-gen.js';

describe('model-gen binding metadata', () => {
  test('lowers canonical named SQL without emitting application values', () => {
    const rootDir = mkdtempSync(path.join(tmpdir(), 'ashiba-model-gen-'));
    try {
      writeFileSync(path.join(rootDir, 'list.sql'), "select ':ignored', id from items where account_id = :account_id or owner_id = :account_id and note = :note", 'utf8');
      const result = runModelGen({ rootDir, sqlFile: 'list.sql' });
      expect(result.bindings.postgres).toEqual({ style: 'indexed', sql: "select ':ignored', id from items where account_id = $1 or owner_id = $1 and note = $2", parameterNames: ['account_id', 'note'] });
      expect(result.bindings.mysql2.valueNames).toEqual(['account_id', 'account_id', 'note']);
      expect(result.bindings.mssql.parameterNames).toEqual(['account_id', 'note']);
      expect(result.contents).not.toContain('account value');
    } finally { rmSync(rootDir, { recursive: true, force: true }); }
  });

  test('fails closed when checked metadata is stale', () => {
    const rootDir = mkdtempSync(path.join(tmpdir(), 'ashiba-model-gen-'));
    try {
      writeFileSync(path.join(rootDir, 'list.sql'), 'select * from items where id = :id', 'utf8');
      runModelGen({ rootDir, sqlFile: 'list.sql', out: 'list.bindings.ts' });
      expect(runModelGen({ rootDir, sqlFile: 'list.sql', out: 'list.bindings.ts', check: true }).fresh).toBe(true);
      writeFileSync(path.join(rootDir, 'list.sql'), 'select * from items where id = :id and owner = :owner', 'utf8');
      expect(runModelGen({ rootDir, sqlFile: 'list.sql', out: 'list.bindings.ts', check: true }).fresh).toBe(false);
    } finally { rmSync(rootDir, { recursive: true, force: true }); }
  });
});
