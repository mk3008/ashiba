import { describe, expect, test } from 'vitest';
import { buildPgDumpArgs, createPgDumpCommand, createPgDumpCommandPreview, pullPostgresDdl } from '../src/index.js';

describe('@ashiba-ts/ddl-pull-pg-dump', () => {
  test('builds schema-only pg_dump args', () => {
    expect(
      buildPgDumpArgs({
        database: 'app',
        host: 'localhost',
        port: 5432,
        username: 'postgres',
        schemas: ['public', 'app'],
      }),
    ).toEqual([
      '--schema-only',
      '--no-owner',
      '--no-privileges',
      '--host',
      'localhost',
      '--port',
      '5432',
      '--username',
      'postgres',
      '--schema',
      'public',
      '--schema',
      'app',
      'app',
    ]);
  });

  test('keeps pg_dump command separate from driver adapters', () => {
    expect(createPgDumpCommand({ databaseUrl: 'postgres://example/db' })).toEqual({
      command: 'pg_dump',
      args: ['--schema-only', '--no-owner', '--no-privileges', 'postgres://example/db'],
    });
  });

  test('redacts connection passwords from command previews', () => {
    expect(createPgDumpCommandPreview({ databaseUrl: 'postgres://user:secret@example/db' })).toEqual({
      command: 'pg_dump',
      args: ['--schema-only', '--no-owner', '--no-privileges', 'postgres://user:****@example/db'],
    });
  });

  test('reports pg_dump spawn failures with cause and next action', async () => {
    await expect(pullPostgresDdl({
      executable: 'ashiba-missing-pg-dump-for-test',
      databaseUrl: 'postgres://user:secret@example/db',
    })).rejects.toMatchObject({
      code: 'ASHIBA_DDL_PULL_SPAWN_FAILED',
      causeText: expect.any(String),
      nextAction: expect.stringContaining('Install pg_dump'),
      details: {
        command: 'ashiba-missing-pg-dump-for-test',
        args: expect.arrayContaining(['postgres://user:****@example/db']),
      },
    });
  });
});
