import { describe, expect, test } from 'vitest';
import { SqlParser } from 'rawsql-ts';
import { createHash } from 'node:crypto';
import { formatAshibaError } from '../src/error-format.js';
import { buildProgram, getErrorMode, VERSION } from '../src/index.js';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { formatAtlasInitResult, runAtlasInit } from '../src/commands/atlas.js';
import { runInit } from '../src/commands/init.js';
import { runCheckContract, formatCheckContractResult } from '../src/commands/check-contract.js';
import { formatAshibaCheckResult, runAshibaCheck } from '../src/commands/check.js';
import { createDefaultConfig, formatDefaultConfig, loadProjectPathConfig } from '../src/commands/config.js';
import { runDdlMigrationGenerate } from '../src/commands/ddl.js';
import { COMMANDS, formatDescribe } from '../src/commands/describe.js';
import { runFeatureGeneratedMapperCheck, runFeatureImport, runFeatureQueryMetadataRefresh, runFeatureQueryScaffold, runFeatureScaffold, runFeatureTestsCheck, runFeatureTestsScaffold } from '../src/commands/feature.js';
import { runGateScaffold } from '../src/commands/gate.js';
import { runLint } from '../src/commands/lint.js';
import { runModelGen } from '../src/commands/model-gen.js';
import { runPerfInit, runPerfReportDiff, runPerfRun, runPerfScenarioInit, runPerfScenarioMeasure } from '../src/commands/perf.js';
import { formatProjectCheckResult, runProjectCheck } from '../src/commands/project.js';
import { runQueryFormat, runQueryFormatAll, runQueryLint, runQueryOptionalAdd, runQuerySlice, runQueryStructure, runQueryUses } from '../src/commands/query.js';
import { runRfbaInspect } from '../src/commands/rfba.js';
import { collectTableReferences } from '../src/commands/table-resolution.js';

describe('@ashiba-ts/cli smoke', () => {
  test('builds an ashiba program', () => {
    const program = buildProgram();
    const help = captureCommandHelp(program);

    expect(program.name()).toBe('ashiba');
    expect(program.description()).toContain('SQL-first scaffold and verification CLI');
    expect(help).toContain('ashiba query format');
  });

  test('exposes the initial version', () => {
    const packageJson = JSON.parse(readFileSync('package.json', 'utf8')) as { version: string };

    expect(VERSION).toBe(packageJson.version);
  });

  test('supports human and AI error output modes', async () => {
    const program = buildProgram();
    program.setOptionValue('errorFormat', 'ai');

    expect(getErrorMode(program)).toBe('ai');
  });

  test('formats structured CLI errors for AI output', () => {
    try {
      runDdlMigrationGenerate({ to: 'new.sql' });
      throw new Error('expected runDdlMigrationGenerate to fail');
    } catch (error) {
      const formatted = formatAshibaError(error, 'ai').data;
      const humanText = formatAshibaError(error, 'human').text;

      expect(formatted).toMatchObject({
        code: 'ASHIBA_REQUIRED_CLI_VALUE',
        message: '--from is required.',
        cause: 'The command requires --from, but the value was empty or missing.',
        nextAction: 'Pass --from with a non-empty value and rerun the command.',
      });
      expect(humanText).toContain('Cause: The command requires --from, but the value was empty or missing.');
      expect(humanText).toContain('Next: Pass --from with a non-empty value and rerun the command.');
    }
  });

  test('exposes config command', () => {
    const program = buildProgram();

    expect(program.commands.some((command) => command.name() === 'config')).toBe(true);
    expect(createDefaultConfig().tests.mapperLane).toBe('ztd');
    expect(createDefaultConfig().featureRoot).toBe('src/features');
    expect(createDefaultConfig().sqlRoots).toEqual(['src/features']);
    expect(formatDefaultConfig()).toContain('"parameterStyle": "both"');
    expect(formatDefaultConfig()).toContain('"identifierEscape": "quote"');
    expect(formatDefaultConfig()).toContain('"identifierEscapeTarget": "minimal"');
    expect(formatDefaultConfig()).toContain('"commaBreak": "before"');
    expect(formatDefaultConfig()).toContain('"cteCommaBreak": "after"');
    expect(formatDefaultConfig()).toContain('"joinOnBreak": "before"');
    expect(formatDefaultConfig()).toContain('"oneLineMaxLength": 100');
    expect(formatDefaultConfig({ pretty: false })).not.toContain('\n  ');
  });

  test('loads trimmed project path config values', () => {
    const rootDir = mkdtempSync(path.join(tmpdir(), 'ashiba-config-'));

    try {
      writeFileSync(path.join(rootDir, 'ashiba.config.json'), JSON.stringify({
        featureRoot: ' src/usecases ',
        sqlRoots: [' src/usecases ', ' ', ' src/repositories '],
      }), 'utf8');

      expect(loadProjectPathConfig(rootDir)).toEqual({
        featureRoot: 'src/usecases',
        sqlRoots: ['src/usecases', 'src/repositories'],
        defaultSchema: 'public',
        searchPath: ['public'],
        mutation: {
          optimisticLock: {
            versionColumn: 'version_key',
            scaffold: 'when-column-exists',
          },
        },
      });
    } finally {
      rmSync(rootDir, { recursive: true, force: true });
    }
  });

  test('describes the migrated command surface', () => {
    const commandNames = COMMANDS.map((command) => command.name);
    const rendered = formatDescribe(COMMANDS);

    expect(commandNames).toEqual(expect.arrayContaining([
      'ddl migration generate',
      'atlas init',
      'check',
      'gate scaffold',
      'query outline',
      'query graph',
      'query slice',
      'query format',
      'query optional add',
      'query optional refresh',
      'feature import',
      'feature query scaffold',
      'feature tests scaffold',
      'feature tests check',
      'project check',
      'perf scenario init',
      'perf scenario measure',
      'perf report diff',
      'rfba inspect',
    ]));
    expect(rendered).toContain('Ashiba command catalog');
    expect(rendered).toContain('- query graph: Build a dependency graph for CTE-heavy SQL.');
    expect(rendered).toContain('use case: Debug a complex CTE');
  });

  test('keeps command catalog use cases visible in command help', () => {
    const program = buildProgram();

    for (const command of COMMANDS) {
      const registered = findRegisteredCommand(program, command.name);

      expect(registered, `missing registered command for ${command.name}`).toBeDefined();
      if (!registered) {
        throw new Error(`missing registered command for ${command.name}`);
      }
      expect(registered?.description(), `description drift for ${command.name}`).toBe(command.summary.replace(/\.$/, ''));

      const help = captureCommandHelp(registered);
      expect(help, `help drift for ${command.name}`).toContain(command.useCase);
      expect(help, `help missing catalog pointer for ${command.name}`).toContain('Catalog use case:');
      for (const note of command.notes ?? []) {
        expect(help, `help missing catalog note for ${command.name}`).toContain(note);
      }
      for (const example of command.examples ?? []) {
        expect(help, `help missing catalog example for ${command.name}`).toContain(example);
      }
    }
  });

  test('scaffolds optional Atlas workflow files without requiring Atlas', () => {
    const rootDir = mkdtempSync(path.join(tmpdir(), 'ashiba-atlas-init-'));

    try {
      writeFileSync(path.join(rootDir, 'package.json'), JSON.stringify({
        type: 'module',
        scripts: {
          test: 'vitest run',
        },
      }, null, 2), 'utf8');

      const result = runAtlasInit({ rootDir });
      const output = formatAtlasInitResult(result);
      const packageJson = readFileSync(path.join(rootDir, 'package.json'), 'utf8');

      expect(result.created).toEqual([
        'atlas.hcl',
        'migrations/.gitkeep',
        'docs/recipes/migration-with-atlas.md',
      ]);
      expect(result.skipped).toEqual([]);
      expect(readFileSync(path.join(rootDir, 'atlas.hcl'), 'utf8')).toContain('src = "file://db/ddl"');
      expect(readFileSync(path.join(rootDir, 'migrations/.gitkeep'), 'utf8')).toBe('');
      const recipe = readFileSync(path.join(rootDir, 'docs/recipes/migration-with-atlas.md'), 'utf8');
      expect(recipe).toContain("Ashiba's default development workflow is migration zero.");
      expect(recipe).toContain('Atlas is optional');
      expect(recipe).toContain('Ashiba does not install, bundle, or require Atlas.');
      expect(recipe).toContain('Atlas Pro is not required for the default Ashiba workflow.');
      expect(recipe).toContain('Production apply should be owned by the project deployment policy, not by Ashiba.');
      expect(recipe).toContain('atlas migrate diff <name> --env local');
      expect(recipe).toContain('db:migration:lint:pro');
      expect(packageJson).toContain('"test": "vitest run"');
      expect(packageJson).not.toContain('db:migration:diff');
      expect(output).toContain('Atlas is optional.');
      expect(output).toContain('Suggested package.json scripts:');
      expect(output).toContain('"db:migration:diff": "atlas migrate diff --env local"');
      expect(output).not.toContain('atlas migrate lint');
    } finally {
      rmSync(rootDir, { recursive: true, force: true });
    }
  });

  test('does not overwrite existing Atlas workflow files', () => {
    const rootDir = mkdtempSync(path.join(tmpdir(), 'ashiba-atlas-init-existing-'));

    try {
      mkdirSync(path.join(rootDir, 'migrations'), { recursive: true });
      mkdirSync(path.join(rootDir, 'docs', 'recipes'), { recursive: true });
      writeFileSync(path.join(rootDir, 'atlas.hcl'), 'custom atlas config\n', 'utf8');
      writeFileSync(path.join(rootDir, 'migrations', '.gitkeep'), 'keep me\n', 'utf8');

      const result = runAtlasInit({ rootDir });
      const output = formatAtlasInitResult(result);

      expect(result.created).toEqual(['docs/recipes/migration-with-atlas.md']);
      expect(result.skipped).toEqual(['atlas.hcl', 'migrations/.gitkeep']);
      expect(readFileSync(path.join(rootDir, 'atlas.hcl'), 'utf8')).toBe('custom atlas config\n');
      expect(readFileSync(path.join(rootDir, 'migrations', '.gitkeep'), 'utf8')).toBe('keep me\n');
      expect(output).toContain('Atlas workflow scaffold checked.');
      expect(output).toContain('Skipped because already exists:');
      expect(output).toContain('No existing files were overwritten.');
    } finally {
      rmSync(rootDir, { recursive: true, force: true });
    }
  });

  test('uses configured Ashiba DDL source directory in Atlas scaffold', () => {
    const rootDir = mkdtempSync(path.join(tmpdir(), 'ashiba-atlas-init-config-'));

    try {
      writeFileSync(path.join(rootDir, 'ashiba.config.json'), JSON.stringify({
        ddl: {
          sourceDir: 'schema/postgres',
        },
      }, null, 2), 'utf8');

      runAtlasInit({ rootDir });

      expect(readFileSync(path.join(rootDir, 'atlas.hcl'), 'utf8')).toContain('src = "file://schema/postgres"');
      expect(readFileSync(path.join(rootDir, 'docs/recipes/migration-with-atlas.md'), 'utf8')).toContain('`schema/postgres`');
    } finally {
      rmSync(rootDir, { recursive: true, force: true });
    }
  });

  test('creates a small SQL-first starter', () => {
    const rootDir = mkdtempSync(path.join(tmpdir(), 'ashiba-init-'));

    try {
      writePostgresStarterPackageJson(rootDir);
      const result = runInit({ dir: rootDir, db: 'postgres', driver: 'pg' });

      expect(result.files.some((file) => file.relativePath === 'db/ddl/public.sql')).toBe(false);
      expect(result.files.some((file) => file.relativePath === 'ashiba.config.json')).toBe(true);
      expect(result.files.some((file) => file.relativePath === 'vitest.config.ts')).toBe(true);
      expect(result.files.some((file) => file.relativePath === 'tsconfig.json')).toBe(true);
      expect(result.files.some((file) => file.relativePath === 'compose.yaml')).toBe(true);
      expect(result.files.some((file) => file.relativePath === '.env.example')).toBe(true);
      expect(result.files.some((file) => file.relativePath === 'tests/support/setup-env.ts')).toBe(true);
      expect(result.files.some((file) => file.relativePath === 'tests/support/ztd/harness.ts')).toBe(true);
      expect(result.files.some((file) => file.relativePath === 'tests/support/ztd/verifier.ts')).toBe(true);
      expect(result.files.some((file) => file.relativePath === 'src/features/_shared/featureQueryExecutor.ts')).toBe(true);
      expect(result.files.some((file) => file.relativePath === 'src/adapters/pg/pool.ts')).toBe(true);
      expect(readFileSync(path.join(rootDir, 'README.md'), 'utf8')).toContain('Show me the SQL.');
      expect(readFileSync(path.join(rootDir, 'README.md'), 'utf8')).toContain('docker compose up -d');
      expect(readFileSync(path.join(rootDir, 'README.md'), 'utf8')).toContain('#features/*');
      expect(readFileSync(path.join(rootDir, 'vitest.config.ts'), 'utf8')).toContain("'#features'");
      expect(readFileSync(path.join(rootDir, 'vitest.config.ts'), 'utf8')).toContain("'#tests'");
      expect(readFileSync(path.join(rootDir, 'tsconfig.json'), 'utf8')).not.toContain('"baseUrl"');
      expect(readFileSync(path.join(rootDir, 'tsconfig.json'), 'utf8')).toContain('"#features/*"');
      expect(readFileSync(path.join(rootDir, 'tsconfig.json'), 'utf8')).toContain('"./src/features/*"');
      expect(readFileSync(path.join(rootDir, 'tsconfig.json'), 'utf8')).toContain('"#tests/*"');
      expect(readFileSync(path.join(rootDir, 'tsconfig.json'), 'utf8')).toContain('"./tests/*"');
      expect(readFileSync(path.join(rootDir, 'ashiba.config.json'), 'utf8')).toContain('"format"');
      expect(readFileSync(path.join(rootDir, 'ashiba.config.json'), 'utf8')).toContain('"identifierEscape": "quote"');
      expect(readFileSync(path.join(rootDir, 'ashiba.config.json'), 'utf8')).toContain('"identifierEscapeTarget": "minimal"');
      expect(readFileSync(path.join(rootDir, 'ashiba.config.json'), 'utf8')).toContain('"parameterSymbol": ":"');
      expect(readFileSync(path.join(rootDir, 'ashiba.config.json'), 'utf8')).toContain('"commaBreak": "before"');
      expect(readFileSync(path.join(rootDir, 'ashiba.config.json'), 'utf8')).toContain('"cteCommaBreak": "after"');
      expect(readFileSync(path.join(rootDir, 'ashiba.config.json'), 'utf8')).toContain('"joinOnBreak": "before"');
      expect(readFileSync(path.join(rootDir, 'ashiba.config.json'), 'utf8')).toContain('"oneLineMaxLength": 100');
      expect(readFileSync(path.join(rootDir, 'ashiba.config.json'), 'utf8')).toContain('"joinConditionOrderByDeclaration": false');
      expect(readFileSync(path.join(rootDir, 'compose.yaml'), 'utf8')).toContain('${ASHIBA_TEST_DB_PORT:-5432}:5432');
      expect(readFileSync(path.join(rootDir, 'compose.yaml'), 'utf8')).toContain('network_mode: bridge');
      expect(readFileSync(path.join(rootDir, 'compose.yaml'), 'utf8')).toContain('POSTGRES_USER: ${ASHIBA_TEST_DB_USER:-ashiba}');
      expect(readFileSync(path.join(rootDir, '.env.example'), 'utf8')).toContain('ASHIBA_TEST_DB_PORT=5432');
      expect(readFileSync(path.join(rootDir, '.env.example'), 'utf8')).toContain('ASHIBA_TEST_DB_NAME=ashiba');
      expect(readFileSync(path.join(rootDir, '.env.example'), 'utf8')).toContain('ASHIBA_TEST_DB_USER=ashiba');
      expect(readFileSync(path.join(rootDir, '.env.example'), 'utf8')).toContain('ASHIBA_TEST_DB_PASSWORD=ashiba');
      expect(readFileSync(path.join(rootDir, 'tests/support/setup-env.ts'), 'utf8')).toContain('ASHIBA_TEST_DATABASE_URL');
      expect(readFileSync(path.join(rootDir, 'tests/support/setup-env.ts'), 'utf8')).toContain('ASHIBA_TEST_DATABASE_URL conflicts');
      expect(readFileSync(path.join(rootDir, 'tests/support/setup-env.ts'), 'utf8')).toContain('ASHIBA_TEST_DB_HOST');
      expect(readFileSync(path.join(rootDir, 'src/adapters/pg/pool.ts'), 'utf8')).toContain('createPgPool');
      expect(readFileSync(path.join(rootDir, 'src/adapters/pg/pool.ts'), 'utf8')).toContain('createPgSqlClient');
      expect(readFileSync(path.join(rootDir, 'src/adapters/pg/pool.ts'), 'utf8')).toContain('createPgFeatureQueryExecutor');
      expect(readFileSync(path.join(rootDir, 'src/adapters/pg/pool.ts'), 'utf8')).toContain('query -> feature -> sqlClient -> logger');
      expect(readFileSync(path.join(rootDir, 'src/adapters/pg/pool.ts'), 'utf8')).toContain('../logger/sqlLogger.ts');
      expect(readFileSync(path.join(rootDir, 'src/adapters/pg/pool.ts'), 'utf8')).toContain('queryModelSourceHash');
      expect(readFileSync(path.join(rootDir, 'src/adapters/pg/pool.ts'), 'utf8')).toContain('queryModelStatementKind');
      expect(readFileSync(path.join(rootDir, 'src/adapters/pg/pool.ts'), 'utf8')).toContain('queryModelOptionalConditionCompression');
      expect(readFileSync(path.join(rootDir, 'src/adapters/pg/pool.ts'), 'utf8')).toContain('queryModelSafeSortInsertionStatus');
      expect(readFileSync(path.join(rootDir, 'src/adapters/logger/sqlLogger.ts'), 'utf8')).toContain('This is the intended hole for your application logger.');
      expect(readFileSync(path.join(rootDir, 'src/adapters/pg/pool.ts'), 'utf8')).toContain('withPgFeatureQueryExecutor');
      expect(readFileSync(path.join(rootDir, 'src/adapters/pg/pool.ts'), 'utf8')).toContain('withPgTransaction');
      expect(readFileSync(path.join(rootDir, 'src/adapters/pg/pool.ts'), 'utf8')).toContain('PgTransactionOptions');
      expect(readFileSync(path.join(rootDir, 'src/adapters/pg/pool.ts'), 'utf8')).toContain('PgSqlClientContext');
      expect(readFileSync(path.join(rootDir, 'src/adapters/pg/pool.ts'), 'utf8')).toContain('isClientBorrowed: true');
      expect(readFileSync(path.join(rootDir, 'src/adapters/pg/pool.ts'), 'utf8')).toContain('isTransactionStarted: true');
      expect(readFileSync(path.join(rootDir, 'src/adapters/pg/pool.ts'), 'utf8')).toContain("isolationLevel?: 'read committed' | 'repeatable read' | 'serializable'");
      expect(readFileSync(path.join(rootDir, 'src/adapters/pg/pool.ts'), 'utf8')).toContain("accessMode?: 'read write' | 'read only'");
      expect(readFileSync(path.join(rootDir, 'src/adapters/pg/pool.ts'), 'utf8')).toContain('renderBeginTransactionSql');
      expect(readFileSync(path.join(rootDir, 'src/adapters/pg/pool.ts'), 'utf8')).toContain('Standard path:');
      expect(readFileSync(path.join(rootDir, 'src/adapters/pg/pool.ts'), 'utf8')).toContain('Use this across feature/usecase boundaries');
      expect(readFileSync(path.join(rootDir, 'src/adapters/pg/pool.ts'), 'utf8')).toContain('Ashiba does not own transaction policy');
      expect(readFileSync(path.join(rootDir, 'src/adapters/pg/pool.ts'), 'utf8')).toContain('passes the same FeatureQueryExecutor');
      expect(readFileSync(path.join(rootDir, 'src/adapters/pg/pool.ts'), 'utf8')).toContain('Feature/query code should not call begin/commit/rollback');
      expect(existsSync(path.join(rootDir, 'src/features/smoke'))).toBe(false);
      expect(result.files.some((file) => file.relativePath === 'package.json')).toBe(false);
      expect(readFileSync(path.join(rootDir, 'package.json'), 'utf8')).toContain('"name": "starter"');
      expect(readFileSync(path.join(rootDir, 'docs/migration/status.md'), 'utf8')).toContain('ashiba feature scaffold');
      expect(readFileSync(path.join(rootDir, 'tests/support/ztd/harness.ts'), 'utf8')).toContain('runQuerySpecZtdCases');
      expect(readFileSync(path.join(rootDir, 'tests/support/ztd/harness.ts'), 'utf8')).toContain('createQuerySpecZtdVerifier');
      expect(readFileSync(path.join(rootDir, 'tests/support/ztd/verifier.ts'), 'utf8')).toContain('createQuerySpecZtdVerifier');
      expect(readFileSync(path.join(rootDir, 'tests/support/ztd/verifier.ts'), 'utf8')).toContain('actual instanceof Date');
      expect(readFileSync(path.join(rootDir, 'tests/support/ztd/verifier.ts'), 'utf8')).toContain("Object.prototype.toString.call(value) === '[object Object]'");
      expect(readFileSync(path.join(rootDir, 'tests/support/ztd/verifier.ts'), 'utf8')).toContain('await pool.end()');
      expect(result.files.some((file) => /(^|\/)(AGENTS|AGENT|SKILL)\.md$/i.test(file.relativePath))).toBe(false);
      expect(result.files.some((file) => /(^|\/)(\.agent|\.agents|\.codex|skills|prompts|hooks)(\/|$)/i.test(file.relativePath))).toBe(false);
      expect(existsSync(path.join(rootDir, 'AGENTS.md'))).toBe(false);
      expect(existsSync(path.join(rootDir, 'SKILL.md'))).toBe(false);
    } finally {
      rmSync(rootDir, { recursive: true, force: true });
    }
  });

  test('updates npm-init package.json to the ESM module type required by generated starter code', () => {
    const rootDir = mkdtempSync(path.join(tmpdir(), 'ashiba-init-esm-'));

    try {
      writeFileSync(path.join(rootDir, 'package.json'), `${JSON.stringify({
        name: 'starter',
        private: true,
        dependencies: {
          '@ashiba-ts/driver-adapter-core': '^0.0.0',
          '@ashiba-ts/driver-adapter-pg': '^0.0.0',
          pg: '^8.0.0',
        },
        devDependencies: {
          '@ashiba-ts/cli': '^0.0.0',
          '@ashiba-ts/testkit-adapter-pg': '^0.0.0',
          '@types/pg': '^8.0.0',
          dotenv: '^16.0.0',
          typescript: '^5.0.0',
          vitest: '^4.0.0',
        },
      }, null, 2)}\n`, 'utf8');

      const result = runInit({ dir: rootDir, db: 'postgres', driver: 'pg' });
      const packageJson = JSON.parse(readFileSync(path.join(rootDir, 'package.json'), 'utf8')) as { type?: string };

      expect(result.files[0]).toEqual({ relativePath: 'package.json', action: 'update' });
      expect(packageJson.type).toBe('module');
    } finally {
      rmSync(rootDir, { recursive: true, force: true });
    }
  });

  test('does not silently rewrite an explicit CommonJS package into the ESM starter', () => {
    const rootDir = mkdtempSync(path.join(tmpdir(), 'ashiba-init-commonjs-'));

    try {
      writeFileSync(path.join(rootDir, 'package.json'), `${JSON.stringify({
        name: 'starter',
        private: true,
        type: 'commonjs',
        dependencies: {
          '@ashiba-ts/driver-adapter-core': '^0.0.0',
          '@ashiba-ts/driver-adapter-pg': '^0.0.0',
          pg: '^8.0.0',
        },
        devDependencies: {
          '@ashiba-ts/cli': '^0.0.0',
          '@ashiba-ts/testkit-adapter-pg': '^0.0.0',
          '@types/pg': '^8.0.0',
          dotenv: '^16.0.0',
          typescript: '^5.0.0',
          vitest: '^4.0.0',
        },
      }, null, 2)}\n`, 'utf8');

      expect(() => runInit({ dir: rootDir, db: 'postgres', driver: 'pg' })).toThrow('requires package.json type to be "module"');
    } finally {
      rmSync(rootDir, { recursive: true, force: true });
    }
  });

  test('requires explicit database selection for init', () => {
    const rootDir = mkdtempSync(path.join(tmpdir(), 'ashiba-init-db-'));

    try {
      expect(() => runInit({ dir: rootDir })).toThrow('ashiba init requires an explicit database starter');
      expect(() => runInit({ dir: rootDir, db: 'mysql' })).toThrow('requires an explicit wrapped driver');
      expect(() => runInit({ dir: rootDir, db: 'postgres', driver: 'postgres-js' })).toThrow('Unsupported Ashiba init database/driver pair');
      expect(() => runInit({ dir: rootDir, db: 'postgres', driver: 'pg' })).toThrow('requires package.json');
    } finally {
      rmSync(rootDir, { recursive: true, force: true });
    }
  });

  test('requires postgres starter dependencies before generating pg-specific code', () => {
    const rootDir = mkdtempSync(path.join(tmpdir(), 'ashiba-init-deps-'));

    try {
      writeFileSync(path.join(rootDir, 'package.json'), `${JSON.stringify({
        name: 'starter',
        private: true,
        type: 'module',
        dependencies: { pg: '^8.0.0' },
        devDependencies: { '@ashiba-ts/cli': '^0.0.0' },
      }, null, 2)}\n`);

      expect(() => runInit({ dir: rootDir, db: 'postgres', driver: 'pg' })).toThrow('@ashiba-ts/driver-adapter-pg');
    } finally {
      rmSync(rootDir, { recursive: true, force: true });
    }
  });

  test('creates optional demo DDL files only when requested', () => {
    const rootDir = mkdtempSync(path.join(tmpdir(), 'ashiba-init-demo-ddl-'));

    try {
      writePostgresStarterPackageJson(rootDir);
      const result = runInit({ dir: rootDir, db: 'postgres', driver: 'pg', withDemoDdl: true, withMigrationDemoDdl: true });

      expect(result.files.some((file) => file.relativePath === 'db/ddl/public.sql')).toBe(true);
      expect(result.files.some((file) => file.relativePath === 'tmp/ddl/production.sql')).toBe(true);
      expect(readFileSync(path.join(rootDir, 'db/ddl/public.sql'), 'utf8')).toContain('user_id bigserial primary key');
      expect(readFileSync(path.join(rootDir, 'db/ddl/public.sql'), 'utf8')).toContain('email text not null');
      expect(readFileSync(path.join(rootDir, 'db/ddl/public.sql'), 'utf8')).toContain('display_name text');
      expect(readFileSync(path.join(rootDir, 'db/ddl/public.sql'), 'utf8')).toContain('login_count integer not null default 0');
      expect(readFileSync(path.join(rootDir, 'db/ddl/public.sql'), 'utf8')).toContain('external_account_id bigint not null');
      expect(readFileSync(path.join(rootDir, 'tmp/ddl/production.sql'), 'utf8')).toContain('user_id bigserial primary key');
      expect(readFileSync(path.join(rootDir, 'tmp/ddl/production.sql'), 'utf8')).not.toContain('email text not null');
    } finally {
      rmSync(rootDir, { recursive: true, force: true });
    }
  });

  test('exposes ddl commands backed by migrated risk and diff logic', () => {
    const program = buildProgram();
    expect(program.commands.some((command) => command.name() === 'ddl')).toBe(true);
  });

  test('compares DDL snapshots and can write generated SQL', () => {
    const rootDir = mkdtempSync(path.join(tmpdir(), 'ashiba-ddl-diff-'));

    try {
      const fromPath = path.join(rootDir, 'from.sql');
      const toPath = path.join(rootDir, 'to.sql');
      const outPath = path.join(rootDir, 'migration.sql');
      writeFileSync(fromPath, '', 'utf8');
      writeFileSync(toPath, 'CREATE TABLE public.users (id integer not null);', 'utf8');

      const output = runDdlMigrationGenerate({ from: fromPath, to: toPath, out: outPath });

      expect(output).toContain('create table');
      expect(readFileSync(outPath, 'utf8').toLowerCase()).toContain('create table');
    } finally {
      rmSync(rootDir, { recursive: true, force: true });
    }
  });

  test('creates the output parent directory for generated migration SQL', () => {
    const rootDir = mkdtempSync(path.join(tmpdir(), 'ashiba-ddl-diff-out-dir-'));

    try {
      const fromPath = path.join(rootDir, 'from.sql');
      const toPath = path.join(rootDir, 'to.sql');
      const outPath = path.join(rootDir, 'tmp', 'ddl', 'migration.sql');
      writeFileSync(fromPath, '', 'utf8');
      writeFileSync(toPath, 'CREATE TABLE public.users (id integer not null);', 'utf8');

      const output = runDdlMigrationGenerate({ from: fromPath, to: toPath, out: outPath });

      expect(output).toContain(path.normalize(outPath));
      expect(readFileSync(outPath, 'utf8').toLowerCase()).toContain('create table');
    } finally {
      rmSync(rootDir, { recursive: true, force: true });
    }
  });

  test('exposes concept-aligned ddl migration generate with risk info', () => {
    const rootDir = mkdtempSync(path.join(tmpdir(), 'ashiba-ddl-migration-'));

    try {
      const fromPath = path.join(rootDir, 'from.sql');
      const toPath = path.join(rootDir, 'to.sql');
      const outPath = path.join(rootDir, 'migration.sql');
      writeFileSync(fromPath, 'CREATE TABLE public.users (id integer not null, legacy text);', 'utf8');
      writeFileSync(toPath, 'CREATE TABLE public.users (id integer not null);', 'utf8');

      const generateOutput = runDdlMigrationGenerate({ from: fromPath, to: toPath, out: outPath });

      expect(generateOutput).toContain('DDL migration generate');
      expect(readFileSync(outPath, 'utf8')).toContain('DROP COLUMN');
      expect(generateOutput).toContain('drop_column');
    } finally {
      rmSync(rootDir, { recursive: true, force: true });
    }
  });

  test('can suppress destructive ddl migration operations with safety options', () => {
    const rootDir = mkdtempSync(path.join(tmpdir(), 'ashiba-ddl-migration-safety-'));

    try {
      const fromPath = path.join(rootDir, 'from.sql');
      const toPath = path.join(rootDir, 'to.sql');
      const outPath = path.join(rootDir, 'migration.sql');
      writeFileSync(fromPath, 'CREATE TABLE public.users (id integer not null, legacy text);', 'utf8');
      writeFileSync(toPath, 'CREATE TABLE public.users (id integer not null);', 'utf8');

      const output = runDdlMigrationGenerate({
        from: fromPath,
        to: toPath,
        out: outPath,
        dropColumns: false,
      });

      expect(output).toContain('suppressed operations: dropColumns');
      expect(output).toContain('drop column legacy');
      expect(output).toContain('drop_column');
      expect(readFileSync(outPath, 'utf8')).not.toContain('DROP COLUMN');
    } finally {
      rmSync(rootDir, { recursive: true, force: true });
    }
  });

  test('rejects DDL single-file inputs before raw file reads fail', () => {
    const rootDir = mkdtempSync(path.join(tmpdir(), 'ashiba-ddl-input-'));

    try {
      const toPath = path.join(rootDir, 'to.sql');
      writeFileSync(toPath, 'CREATE TABLE public.users (id integer not null);', 'utf8');

      expect(catchError(() => runDdlMigrationGenerate({ from: rootDir, to: toPath }))).toMatchObject({
        code: 'ASHIBA_DDL_INPUT_FILE_NOT_FILE',
      });
      expect(catchError(() => runDdlMigrationGenerate({ from: path.join(rootDir, 'missing.sql'), to: toPath }))).toMatchObject({
        code: 'ASHIBA_DDL_INPUT_FILE_NOT_FOUND',
      });
    } finally {
      rmSync(rootDir, { recursive: true, force: true });
    }
  });

  test('compares recursive DDL snapshot directories and writes one migration file', () => {
    const rootDir = mkdtempSync(path.join(tmpdir(), 'ashiba-ddl-migration-dir-'));

    try {
      const fromDir = path.join(rootDir, 'from-ddl');
      const toDir = path.join(rootDir, 'to-ddl');
      const outPath = path.join(rootDir, 'migration.sql');
      mkdirSync(path.join(fromDir, 'accounting'), { recursive: true });
      mkdirSync(path.join(toDir, 'accounting'), { recursive: true });
      writeFileSync(path.join(fromDir, 'users.sql'), 'CREATE TABLE public.users (id integer not null);', 'utf8');
      writeFileSync(path.join(fromDir, 'accounting', 'journals.sql'), 'CREATE TABLE accounting.journals (journal_id integer not null);', 'utf8');
      writeFileSync(path.join(toDir, 'users.sql'), 'CREATE TABLE public.users (id integer not null, email text);', 'utf8');
      writeFileSync(path.join(toDir, 'accounting', 'journals.sql'), 'CREATE TABLE accounting.journals (journal_id integer not null);', 'utf8');

      const output = runDdlMigrationGenerate({ fromDir, toDir, out: outPath });

      expect(output).toContain('from files: 2');
      expect(output).toContain('to files: 2');
      expect(output).toContain('add column email');
      expect(readFileSync(outPath, 'utf8')).toContain('ADD COLUMN');
    } finally {
      rmSync(rootDir, { recursive: true, force: true });
    }
  });

  test('can compare a committed git DDL snapshot against the working DDL directory', () => {
    const rootDir = mkdtempSync(path.join(tmpdir(), 'ashiba-ddl-migration-git-'));

    try {
      const ddlDir = path.join(rootDir, 'db', 'ddl');
      const outPath = path.join(rootDir, 'migration.sql');
      mkdirSync(ddlDir, { recursive: true });
      writeFileSync(path.join(ddlDir, 'public.sql'), 'CREATE TABLE public.users (id integer not null, email text);', 'utf8');

      const output = runDdlMigrationGenerate({
        fromGit: 'HEAD:db/ddl',
        toDir: ddlDir,
        out: outPath,
        gitRunner: (args) => {
          if (args[0] === 'cat-file') {
            return 'tree\n';
          }
          if (args[0] === 'ls-tree') {
            return 'db/ddl/public.sql\n';
          }
          if (args[0] === 'show') {
            return 'CREATE TABLE public.users (id integer not null);';
          }
          throw new Error(`Unexpected git args: ${args.join(' ')}`);
        },
      });

      expect(output).toContain('from: HEAD:db/ddl');
      expect(output).toContain('from files: 1');
      expect(output).toContain('to files: 1');
      expect(output).toContain('add column email');
      expect(readFileSync(outPath, 'utf8')).toContain('ADD COLUMN');
    } finally {
      rmSync(rootDir, { recursive: true, force: true });
    }
  });

  test('previews ddl migration generate without writing output in dry-run mode', () => {
    const rootDir = mkdtempSync(path.join(tmpdir(), 'ashiba-ddl-migration-dry-run-'));

    try {
      const fromPath = path.join(rootDir, 'from.sql');
      const toPath = path.join(rootDir, 'to.sql');
      const outPath = path.join(rootDir, 'migration.sql');
      writeFileSync(fromPath, 'CREATE TABLE public.users (id integer not null);', 'utf8');
      writeFileSync(toPath, 'CREATE TABLE public.users (id integer not null, email text not null);', 'utf8');

      const output = runDdlMigrationGenerate({ from: fromPath, to: toPath, out: outPath, dryRun: true });

      expect(output).toContain('dry-run: true');
      expect(output).toContain('(dry-run, not written)');
      expect(existsSync(outPath)).toBe(false);
    } finally {
      rmSync(rootDir, { recursive: true, force: true });
    }
  });

  test('finds query table and column usage through migrated sqlgrep core', () => {
    const rootDir = mkdtempSync(path.join(tmpdir(), 'ashiba-query-uses-'));

    try {
      const sqlDir = path.join(rootDir, 'src', 'features', 'users', 'queries');
      const specPath = path.join(sqlDir, 'users.catalog.json');
      const sqlPath = path.join(sqlDir, 'list.sql');
      mkdirSync(sqlDir, { recursive: true });
      writeFileSync(sqlPath, 'SELECT users.id, users.email FROM public.users users WHERE users.email = :email;', 'utf8');
      writeFileSync(specPath, JSON.stringify({ id: 'users.list', sqlFile: './list.sql' }), 'utf8');

      const tableOutput = runQueryUses('table', 'public.users', { rootDir, view: 'detail' });
      const columnOutput = runQueryUses('column', 'public.users.email', { rootDir, view: 'detail' });

      expect(tableOutput).toContain('matches:');
      expect(tableOutput).toContain('public.users');
      expect(columnOutput).toContain('users.list');
      expect(columnOutput).toContain('email');
    } finally {
      rmSync(rootDir, { recursive: true, force: true });
    }
  });

  test('fails query usage analysis on parser failure unless fallback is explicit', () => {
    const rootDir = mkdtempSync(path.join(tmpdir(), 'ashiba-query-uses-fallback-'));

    try {
      const sqlDir = path.join(rootDir, 'src', 'features', 'users', 'queries');
      const specPath = path.join(sqlDir, 'users.catalog.json');
      const sqlPath = path.join(sqlDir, 'broken.sql');
      mkdirSync(sqlDir, { recursive: true });
      writeFileSync(sqlPath, 'SELECT * FROM public.users WHERE', 'utf8');
      writeFileSync(specPath, JSON.stringify({ id: 'users.broken', sqlFile: './broken.sql' }), 'utf8');

      expect(() => runQueryUses('table', 'public.users', { rootDir, view: 'detail' }))
        .toThrow(/SQL AST parse failed/);

      const fallbackOutput = runQueryUses('table', 'public.users', {
        rootDir,
        view: 'detail',
        allowParserFallback: true,
      });
      expect(fallbackOutput).toContain('parser-fallback');
      expect(fallbackOutput).toContain('fallback matches: 1');
    } finally {
      rmSync(rootDir, { recursive: true, force: true });
    }
  });

  test('scaffolds editable SQL-first feature and query boundaries from DDL', () => {
    const rootDir = mkdtempSync(path.join(tmpdir(), 'ashiba-feature-scaffold-'));

    try {
      mkdirSync(path.join(rootDir, 'db', 'ddl'), { recursive: true });
      writeFileSync(path.join(rootDir, 'db', 'ddl', 'public.sql'), [
        'create table public.users (',
        '  user_id serial primary key,',
        '  email text not null,',
        '  display_name text',
        ');',
        '',
      ].join('\n'), 'utf8');

      const result = runFeatureScaffold({ rootDir, table: 'users', action: 'insert' });
      runFeatureScaffold({ rootDir, table: 'users', action: 'update' });
      runFeatureScaffold({ rootDir, table: 'users', action: 'delete' });
      runFeatureScaffold({ rootDir, table: 'users', action: 'get-by-id' });
      const query = runFeatureQueryScaffold({
        rootDir,
        feature: 'users-insert',
        queryName: 'get-user',
        table: 'users',
        action: 'get-by-id',
      });

      const featureBoundary = readFileSync(path.join(rootDir, 'src/features/users-insert/boundary.ts'), 'utf8');
      const featureReadme = readFileSync(path.join(rootDir, 'src/features/users-insert/README.md'), 'utf8');
      const queryBoundary = readFileSync(path.join(rootDir, 'src/features/users-insert/queries/insert-users/query.ts'), 'utf8');
      const getByIdQueryBoundary = readFileSync(path.join(rootDir, 'src/features/users-insert/queries/get-user/query.ts'), 'utf8');
      const getByIdFeatureQueryBoundary = readFileSync(path.join(rootDir, 'src/features/users-get-by-id/queries/get-by-id/query.ts'), 'utf8');
      const getByIdFeatureWorkflow = readFileSync(path.join(rootDir, 'src/features/users-get-by-id/workflow.ts'), 'utf8');
      const getByIdFeatureOutput = readFileSync(path.join(rootDir, 'src/features/users-get-by-id/output.ts'), 'utf8');
      const queryMeta = readFileSync(path.join(rootDir, 'src/features/users-insert/queries/insert-users/generated/query.meta.ts'), 'utf8');
      const querySqlSource = readFileSync(path.join(rootDir, 'src/features/users-insert/queries/insert-users/generated/query.sql.ts'), 'utf8');
      const queryZtdTest = readFileSync(path.join(rootDir, 'src/features/users-insert/queries/insert-users/tests/insert-users.boundary.ztd.test.ts'), 'utf8');
      const queryZtdTypes = readFileSync(path.join(rootDir, 'src/features/users-insert/queries/insert-users/tests/boundary-ztd-types.ts'), 'utf8');
      const queryTestPlan = readFileSync(path.join(rootDir, 'src/features/users-insert/queries/insert-users/tests/generated/TEST_PLAN.md'), 'utf8');
      const queryMappingCases = readFileSync(path.join(rootDir, 'src/features/users-insert/queries/insert-users/tests/generated/mapping.cases.ts'), 'utf8');
      const querySql = readFileSync(path.join(rootDir, 'src/features/users-insert/queries/insert-users/insert-users.sql'), 'utf8');
      const updateSql = readFileSync(path.join(rootDir, 'src/features/users-update/queries/update-users/update-users.sql'), 'utf8');
      const deleteSql = readFileSync(path.join(rootDir, 'src/features/users-delete/queries/delete-users/delete-users.sql'), 'utf8');

      expect(result.featureName).toBe('users-insert');
      expect(query.queryName).toBe('get-user');
      expect(featureBoundary).toContain('parseRequest');
      expect(featureReadme).toContain('Generated mapper cases prove DB-to-TypeScript result contracts.');
      expect(featureReadme).toContain('passing the same FeatureQueryExecutor');
      expect(featureReadme).toContain('TypeScript-to-DB inputs');
      expect(featureBoundary).toContain('executeWorkflow');
      expect(featureBoundary).toContain('buildResult');
      expect(existsSync(path.join(rootDir, 'src/features/users-insert/input.ts'))).toBe(true);
      expect(existsSync(path.join(rootDir, 'src/features/users-insert/workflow.ts'))).toBe(true);
      expect(existsSync(path.join(rootDir, 'src/features/users-insert/output.ts'))).toBe(true);
      expect(readFileSync(path.join(rootDir, 'src/features/users-insert/input.ts'), 'utf8')).toContain('export interface UsersInsertRequest');
      expect(readFileSync(path.join(rootDir, 'src/features/users-insert/workflow.ts'), 'utf8')).toContain('function toQueryParams');
      expect(readFileSync(path.join(rootDir, 'src/features/users-insert/output.ts'), 'utf8')).toContain('export interface UsersInsertResponse');
      expect(readFileSync(path.join(rootDir, 'src/features/users-insert/workflow.ts'), 'utf8')).toContain("from '#features/_shared/featureQueryExecutor.js'");
      expect(queryBoundary).not.toContain("from 'zod'");
      expect(queryBoundary).toContain("from '#features/_shared/featureQueryExecutor.js'");
      expect(queryBoundary).not.toContain("from '#features/_shared/loadSqlResource.js'");
      expect(queryBoundary).not.toContain("from 'node:fs'");
      expect(queryBoundary).not.toContain("from 'node:path'");
      expect(queryBoundary).not.toContain("from 'node:url'");
      expect(queryBoundary).toContain("from './generated/query.sql.js'");
      expect(queryBoundary).toContain('export const insertUsersSql = querySql;');
      expect(queryBoundary).toContain('sqlPath');
      expect(queryBoundary).toContain('metadata');
      expect(queryBoundary).toContain('queryModel');
      expect(queryBoundary).toContain("from './generated/query.meta.js'");
      expect(queryBoundary).not.toContain('optionalConditionCompression: true');
      expect(getByIdQueryBoundary).toContain('optionalConditionCompression: true');
      expect(getByIdQueryBoundary).toContain("import { queryOneOrNull, type FeatureQueryExecutor } from '#features/_shared/featureQueryExecutor.js';");
      expect(getByIdQueryBoundary).toContain('): Promise<GetUserQueryResult | null> {');
      expect(getByIdQueryBoundary).toContain('return queryOneOrNull<QueryRow>(executor, getUserQuery, params as unknown as Record<string, unknown>);');
      expect(getByIdFeatureQueryBoundary).toContain('): Promise<GetByIdQueryResult | null> {');
      expect(getByIdFeatureWorkflow).toContain('export type UsersGetByIdWorkflowResult = GetByIdQueryResult | null;');
      expect(getByIdFeatureWorkflow).toContain(') => Promise<GetByIdQueryResult | null>;');
      expect(getByIdFeatureOutput).toContain('export type UsersGetByIdResponse = {');
      expect(getByIdFeatureOutput).toContain('} | null;');
      expect(getByIdFeatureOutput).toContain('if (result === null) return null;');
      expect(queryMeta).toContain('Generated by Ashiba. Do not edit by hand.');
      expect(queryMeta).toContain('"postgres"');
      expect(queryMeta).not.toContain('"mysql2"');
      expect(queryMeta).not.toContain('"mssql"');
      expect(querySqlSource).toContain('Generated by Ashiba. Do not edit by hand.');
      expect(querySqlSource).toContain('export const querySql =');
      expect(existsSync(path.join(rootDir, 'src/features/_shared/loadSqlResource.ts'))).toBe(false);
      expect(queryZtdTest).toContain("from '#tests/support/ztd/harness.js'");
      expect(queryZtdTest).not.toContain('db/ddl/public.sql');
      expect(queryZtdTest).not.toContain('existsSync');
      expect(queryZtdTypes).toContain("from '#tests/support/ztd/case-types.js'");
      expect(queryTestPlan).toContain('Unit tests are mapping-contract tests');
      expect(queryTestPlan).toContain('RETURNING row compatibility only');
      expect(queryTestPlan).toContain('TypeScript-to-DB inputs');
      expect(queryTestPlan).toContain('DDL is loaded from the configured DDL source directory');
      expect(queryMappingCases).toContain('mapperProbe');
      expect(queryMappingCases).toContain('maps insert-users DB result values into the DTO');
      expect(queryMappingCases).toContain('select\\n    cast(');
      expect(queryMappingCases).not.toContain('binds insert-users insert params');
      expect(queryMappingCases).not.toContain('inserts insert-users row');
      expect(querySql).toContain(':email');
      expect(querySql).not.toContain(':user_id');
      expect(querySql).toContain('returning\n    user_id\n    , email\n    , display_name');
      expect(updateSql).toContain('returning\n    user_id\n    , email\n    , display_name');
      expect(deleteSql).toContain('returning\n    user_id\n    , email\n    , display_name');
    } finally {
      rmSync(rootDir, { recursive: true, force: true });
    }
  });

  test('generates DB-valid mapping probe literals for timestamp and json columns', () => {
    const rootDir = mkdtempSync(path.join(tmpdir(), 'ashiba-feature-mapping-literals-'));

    try {
      mkdirSync(path.join(rootDir, 'db', 'ddl'), { recursive: true });
      writeFileSync(path.join(rootDir, 'db', 'ddl', 'public.sql'), [
        'create table public.event_logs (',
        '  event_log_id serial primary key,',
        '  created_at timestamptz not null,',
        "  payload jsonb not null default '{}'::jsonb",
        ');',
        '',
      ].join('\n'), 'utf8');

      runFeatureScaffold({ rootDir, table: 'event_logs', action: 'insert' });

      const queryMappingCases = readFileSync(path.join(rootDir, 'src/features/event-logs-insert/queries/insert-event-logs/tests/generated/mapping.cases.ts'), 'utf8');

      expect(queryMappingCases).toContain("cast('2026-01-01T00:00:00.000Z' as timestamptz)");
      expect(queryMappingCases).toContain('as jsonb');
      expect(queryMappingCases).toContain('sample');
      expect(queryMappingCases).not.toContain('created_at-boundary-value');
      expect(queryMappingCases).not.toContain('payload-boundary-value');
      expect(queryMappingCases).not.toContain('[object Object]');
    } finally {
      rmSync(rootDir, { recursive: true, force: true });
    }
  });

  test('scaffolds insert queries with minimal RETURNING when requested', () => {
    const rootDir = mkdtempSync(path.join(tmpdir(), 'ashiba-feature-insert-minimal-returning-'));

    try {
      mkdirSync(path.join(rootDir, 'db', 'ddl'), { recursive: true });
      writeFileSync(path.join(rootDir, 'db', 'ddl', 'public.sql'), [
        'create table public.users (',
        '  user_id serial primary key,',
        '  email text not null,',
        '  display_name text,',
        "  created_at timestamptz not null default now()",
        ');',
        '',
      ].join('\n'), 'utf8');

      runFeatureScaffold({ rootDir, table: 'users', action: 'insert', returning: 'minimal' });

      const sqlPath = path.join(rootDir, 'src/features/users-insert/queries/insert-users/insert-users.sql');
      const queryPath = path.join(rootDir, 'src/features/users-insert/queries/insert-users/query.ts');
      const mappingPath = path.join(rootDir, 'src/features/users-insert/queries/insert-users/tests/generated/mapping.cases.ts');
      const analysisPath = path.join(rootDir, 'src/features/users-insert/queries/insert-users/tests/generated/analysis.json');

      const sql = readFileSync(sqlPath, 'utf8');
      const queryBoundary = readFileSync(queryPath, 'utf8');
      const queryMappingCases = readFileSync(mappingPath, 'utf8');
      const analysis = JSON.parse(readFileSync(analysisPath, 'utf8')) as { returningMode?: string };

      expect(sql).toContain('returning\n    user_id');
      expect(sql).toContain(':email');
      expect(sql).toContain(':display_name');
      expect(sql.split('returning')[1]).not.toContain('email');
      expect(sql.split('returning')[1]).not.toContain('display_name');
      expect(sql.split('returning')[1]).not.toContain('created_at');
      expect(queryBoundary).toContain('export interface InsertUsersQueryResult');
      expect(queryBoundary).toContain('user_id: number;');
      const resultContract = queryBoundary.split('export interface InsertUsersQueryResult')[1]?.split('}')[0] ?? '';
      expect(resultContract).not.toContain('email: string;');
      expect(resultContract).not.toContain('display_name: string');
      expect(queryMappingCases).toContain('as \\"user_id\\"');
      expect(queryMappingCases).not.toContain('as \\"email\\"');
      expect(queryMappingCases).not.toContain('as \\"display_name\\"');
      expect(analysis.returningMode).toBe('minimal');

      const check = runFeatureTestsCheck({ rootDir, feature: 'users-insert', query: 'insert-users', fix: true });
      expect(check.ok).toBe(true);
      expect(readFileSync(mappingPath, 'utf8')).not.toContain('as \\"email\\"');
    } finally {
      rmSync(rootDir, { recursive: true, force: true });
    }
  });

  test('scaffolds update queries with configured optimistic lock columns', () => {
    const rootDir = mkdtempSync(path.join(tmpdir(), 'ashiba-feature-update-optimistic-lock-'));

    try {
      mkdirSync(path.join(rootDir, 'db', 'ddl'), { recursive: true });
      writeFileSync(path.join(rootDir, 'ashiba.config.json'), JSON.stringify({
        featureRoot: 'src/features',
        sqlRoots: ['src/features'],
        mutation: {
          optimisticLock: {
            versionColumn: 'version_key',
            scaffold: 'when-column-exists',
          },
        },
      }, null, 2), 'utf8');
      writeFileSync(path.join(rootDir, 'db', 'ddl', 'public.sql'), [
        'create table public.tickets (',
        '  ticket_id bigserial primary key,',
        '  status text not null,',
        '  subject text not null,',
        '  version_key integer not null default 1',
        ');',
        '',
      ].join('\n'), 'utf8');

      runFeatureScaffold({ rootDir, table: 'tickets', action: 'update' });

      const sql = readFileSync(path.join(rootDir, 'src/features/tickets-update/queries/update-tickets/update-tickets.sql'), 'utf8');
      const queryBoundary = readFileSync(path.join(rootDir, 'src/features/tickets-update/queries/update-tickets/query.ts'), 'utf8');
      const analysis = JSON.parse(readFileSync(path.join(rootDir, 'src/features/tickets-update/queries/update-tickets/tests/generated/analysis.json'), 'utf8')) as {
        optimisticLock?: { versionColumn?: string; expectedVersionParameter?: string };
      };

      expect(sql).toContain('status = :status');
      expect(sql).toContain('subject = :subject');
      expect(sql).toContain('version_key = version_key + 1');
      expect(sql).toContain('and version_key = :expected_version_key');
      expect(sql).not.toContain('version_key = :version_key');
      expect(queryBoundary).toContain('expected_version_key: number;');
      const paramsBlock = queryBoundary.split('export interface UpdateTicketsQueryParams')[1]?.split('}')[0] ?? '';
      expect(paramsBlock).not.toMatch(/^\s+version_key: number;/m);
      expect(queryBoundary).toContain('version_key: number;');
      expect(analysis.optimisticLock).toEqual({
        versionColumn: 'version_key',
        expectedVersionParameter: 'expected_version_key',
      });

      const check = runFeatureTestsCheck({ rootDir, feature: 'tickets-update', query: 'update-tickets', fix: false });
      expect(check.ok).toBe(true);
    } finally {
      rmSync(rootDir, { recursive: true, force: true });
    }
  });

  test('imports an existing SQL file into a feature with DTO mapper metadata and ZTD cases', () => {
    const rootDir = mkdtempSync(path.join(tmpdir(), 'ashiba-feature-import-sql-'));

    try {
      mkdirSync(path.join(rootDir, 'db', 'ddl'), { recursive: true });
      mkdirSync(path.join(rootDir, 'tmp'), { recursive: true });
      writeFileSync(path.join(rootDir, 'db', 'ddl', 'public.sql'), [
        'create table public.users (',
        '  user_id integer primary key,',
        '  email text not null,',
        '  display_name text,',
        '  login_count integer not null default 0',
        ');',
        '',
      ].join('\n'), 'utf8');
      writeFileSync(path.join(rootDir, 'tmp', 'search-users.sql'), [
        'select user_id, email, display_name',
        'from public.users',
        'where email = :email',
        'order by user_id;',
        '',
      ].join('\n'), 'utf8');

      const result = runFeatureImport({
        rootDir,
        feature: 'users-search',
        queryName: 'search',
        sql: 'tmp/search-users.sql',
      });

      const importedSql = readFileSync(path.join(rootDir, 'src/features/users-search/queries/search/search.sql'), 'utf8');
      const queryBoundary = readFileSync(path.join(rootDir, 'src/features/users-search/queries/search/query.ts'), 'utf8');
      const queryMeta = readFileSync(path.join(rootDir, 'src/features/users-search/queries/search/generated/query.meta.ts'), 'utf8');
      const querySqlSource = readFileSync(path.join(rootDir, 'src/features/users-search/queries/search/generated/query.sql.ts'), 'utf8');
      const mappingCases = readFileSync(path.join(rootDir, 'src/features/users-search/queries/search/tests/generated/mapping.cases.ts'), 'utf8');
      const ztdTypes = readFileSync(path.join(rootDir, 'src/features/users-search/queries/search/tests/boundary-ztd-types.ts'), 'utf8');
      const analysis = JSON.parse(readFileSync(path.join(rootDir, 'src/features/users-search/queries/search/tests/generated/analysis.json'), 'utf8')) as {
        status: string;
        table: string;
        action: string;
      };
      const mapperCheck = runFeatureGeneratedMapperCheck({ rootDir, feature: 'users-search', query: 'search' });

      expect(result.featureName).toBe('users-search');
      expect(result.queryName).toBe('search');
      expect(result.sourceSqlFile).toBe('tmp/search-users.sql');
      expect(result.importedSqlFile).toBe('src/features/users-search/queries/search/search.sql');
      expect(result.formatted).toBe(true);
      expect(importedSql).toContain('select\n    user_id\n    , email\n    , display_name');
      expect(importedSql).toContain('where\n    email = :email');
      expect(readFileSync(path.join(rootDir, 'tmp', 'search-users.sql'), 'utf8')).toContain('select user_id, email, display_name');
      expect(queryBoundary).toContain('export interface SearchQueryParams');
      expect(queryBoundary).toContain('email: string;');
      expect(queryBoundary).toContain('export interface SearchQueryResult');
      expect(queryBoundary).toContain('user_id: number | null;');
      expect(queryBoundary).toContain('display_name: string | null;');
      expect(queryBoundary).toContain('Promise<SearchQueryResult[]>');
      expect(queryBoundary).toContain("from './generated/query.meta.js'");
      expect(queryBoundary).toContain("from './generated/query.sql.js'");
      expect(queryBoundary).not.toContain("from '#features/_shared/loadSqlResource.js'");
      expect(queryMeta).toContain('"namedParameters"');
      expect(queryMeta).toContain('"email"');
      expect(queryMeta).toContain('"resultColumns"');
      expect(querySqlSource).toContain('export const querySql =');
      expect(querySqlSource).toContain('display_name');
      expect(mappingCases).toContain('mapperProbe');
      expect(mappingCases).toContain('maps search imported result columns into the DTO');
      expect(mappingCases).toContain('nullable-output-mapping');
      expect(mappingCases).toContain('alice@example.com');
      expect(ztdTypes).toContain('SearchQueryResult[]');
      expect(analysis).toMatchObject({
        status: 'generated-from-imported-sql',
        table: 'public.users',
        action: 'list',
      });
      expect(mapperCheck.ok).toBe(true);
      expect(mapperCheck.checked[0]?.sqlParameters).toEqual(['email']);
      expect(mapperCheck.checked[0]?.sqlResultColumns).toEqual(['display_name', 'email', 'user_id']);

      const queryPath = path.join(rootDir, 'src/features/users-search/queries/search/query.ts');
      writeFileSync(
        queryPath,
        readFileSync(queryPath, 'utf8')
          .replace('user_id: number | null;', 'user_id: string | null;')
          .replace('display_name: string | null;', 'display_name: string;'),
        'utf8',
      );
      const typeDrift = runFeatureGeneratedMapperCheck({ rootDir, feature: 'users-search', query: 'search' });

      expect(typeDrift.ok).toBe(false);
      expect(typeDrift.checked[0]?.mismatchedResultTypes).toEqual([
        'display_name: mapper string / SQL string | null',
        'user_id: mapper string | null / SQL number | null',
      ]);
      expect(typeDrift.checked[0]?.warningResultTypeMismatches).toEqual([]);
    } finally {
      rmSync(rootDir, { recursive: true, force: true });
    }
  });

  test('does not enable optional-condition compression for imported non-select queries', () => {
    const rootDir = mkdtempSync(path.join(tmpdir(), 'ashiba-feature-import-update-sql-'));

    try {
      mkdirSync(path.join(rootDir, 'db', 'ddl'), { recursive: true });
      mkdirSync(path.join(rootDir, 'tmp'), { recursive: true });
      writeFileSync(path.join(rootDir, 'db', 'ddl', 'public.sql'), [
        'create table public.tickets (',
        '  ticket_id integer primary key,',
        '  status text not null,',
        '  version_key integer not null default 1',
        ');',
        '',
      ].join('\n'), 'utf8');
      writeFileSync(path.join(rootDir, 'tmp', 'update-ticket-status.sql'), [
        'update public.tickets',
        'set status = :status,',
        '    version_key = version_key + 1',
        'where ticket_id = :ticket_id',
        '  and version_key = :expected_version_key',
        'returning ticket_id, status, version_key;',
        '',
      ].join('\n'), 'utf8');

      runFeatureImport({
        rootDir,
        feature: 'tickets-update',
        queryName: 'update-ticket-status',
        sql: 'tmp/update-ticket-status.sql',
      });

      const queryBoundary = readFileSync(path.join(rootDir, 'src/features/tickets-update/queries/update-ticket-status/query.ts'), 'utf8');
      const queryMeta = readFileSync(path.join(rootDir, 'src/features/tickets-update/queries/update-ticket-status/generated/query.meta.ts'), 'utf8');

      expect(queryBoundary).not.toContain('optionalConditionCompression: true');
      expect(queryMeta).toContain('"statementKind": "update"');
      expect(queryMeta).not.toContain('"optionalConditionCompression"');
    } finally {
      rmSync(rootDir, { recursive: true, force: true });
    }
  });

  test('imports an existing SQL file under configured featureRoot', () => {
    const rootDir = mkdtempSync(path.join(tmpdir(), 'ashiba-feature-import-config-root-'));

    try {
      mkdirSync(path.join(rootDir, 'tmp'), { recursive: true });
      writeFileSync(path.join(rootDir, 'ashiba.config.json'), JSON.stringify({
        featureRoot: 'src/usecases',
        sqlRoots: ['src/usecases'],
      }, null, 2), 'utf8');
      writeFileSync(path.join(rootDir, 'tmp', 'readiness.sql'), "select true as ready;\n", 'utf8');

      const result = runFeatureImport({
        rootDir,
        feature: 'health-check',
        queryName: 'readiness',
        sql: 'tmp/readiness.sql',
      });

      expect(result.importedSqlFile).toBe('src/usecases/health-check/queries/readiness/readiness.sql');
      expect(existsSync(path.join(rootDir, 'src/usecases/health-check/boundary.ts'))).toBe(true);
      expect(existsSync(path.join(rootDir, 'src/usecases/_shared/featureQueryExecutor.ts'))).toBe(true);
      expect(existsSync(path.join(rootDir, 'src/features/health-check'))).toBe(false);
    } finally {
      rmSync(rootDir, { recursive: true, force: true });
    }
  });

  test('imports unqualified SQL using configured schema search path', () => {
    const rootDir = mkdtempSync(path.join(tmpdir(), 'ashiba-feature-import-schema-path-'));

    try {
      mkdirSync(path.join(rootDir, 'db', 'ddl'), { recursive: true });
      mkdirSync(path.join(rootDir, 'tmp'), { recursive: true });
      writeFileSync(path.join(rootDir, 'ashiba.config.json'), JSON.stringify({
        defaultSchema: 'app',
        searchPath: ['app', 'public'],
      }, null, 2), 'utf8');
      writeFileSync(path.join(rootDir, 'db', 'ddl', 'schema.sql'), [
        'create table public.users (',
        '  user_id integer primary key,',
        '  email text not null',
        ');',
        'create table app.users (',
        '  account_id bigint primary key,',
        '  email text not null,',
        '  display_name text',
        ');',
        '',
      ].join('\n'), 'utf8');
      writeFileSync(path.join(rootDir, 'tmp', 'users.sql'), [
        'select account_id, email, display_name',
        'from users',
        'where account_id = :account_id;',
        '',
      ].join('\n'), 'utf8');

      const result = runFeatureImport({
        rootDir,
        feature: 'users-read',
        queryName: 'read',
        sql: 'tmp/users.sql',
      });
      const queryBoundary = readFileSync(path.join(rootDir, 'src/features/users-read/queries/read/query.ts'), 'utf8');
      const analysis = JSON.parse(readFileSync(path.join(rootDir, 'src/features/users-read/queries/read/tests/generated/analysis.json'), 'utf8')) as {
        table?: string;
        primaryKeyColumn?: string;
        mappingCaseSignature?: {
          params?: Array<{ name: string; typeScriptType: string }>;
        };
      };

      expect(result.importedSqlFile).toBe('src/features/users-read/queries/read/read.sql');
      expect(queryBoundary).toContain('account_id: string;');
      expect(queryBoundary).toContain('display_name: string | null;');
      expect(analysis).toMatchObject({
        table: 'app.users',
        primaryKeyColumn: 'account_id',
      });
      expect(analysis.mappingCaseSignature?.params).toEqual([
        { name: 'account_id', typeScriptType: 'string' },
      ]);
    } finally {
      rmSync(rootDir, { recursive: true, force: true });
    }
  });

  test('imports CTE-anchored SQL without treating the final CTE source as a DDL table', () => {
    const rootDir = mkdtempSync(path.join(tmpdir(), 'ashiba-feature-import-cte-anchor-'));

    try {
      mkdirSync(path.join(rootDir, 'db', 'ddl'), { recursive: true });
      mkdirSync(path.join(rootDir, 'tmp'), { recursive: true });
      writeFileSync(path.join(rootDir, 'db', 'ddl', 'public.sql'), [
        'create table public.tickets (',
        '  ticket_id integer primary key,',
        '  customer_id integer not null,',
        '  subject text not null,',
        '  created_at timestamptz not null',
        ');',
        'create table public.customers (',
        '  customer_id integer primary key,',
        '  display_name text not null',
        ');',
        '',
      ].join('\n'), 'utf8');
      writeFileSync(path.join(rootDir, 'tmp', 'list-tickets.sql'), [
        'with ticket_base as (',
        '  select',
        '    t.ticket_id,',
        '    t.subject,',
        '    t.created_at,',
        '    c.display_name as customer_name',
        '  from public.tickets t',
        '  inner join public.customers c on c.customer_id = t.customer_id',
        '),',
        'ticket_view as (',
        '  select',
        '    ticket_id,',
        '    subject,',
        '    created_at,',
        '    customer_name',
        '  from ticket_base',
        ')',
        'select ticket_id, subject, created_at, customer_name',
        'from ticket_view',
        'order by ticket_id;',
        '',
      ].join('\n'), 'utf8');

      const result = runFeatureImport({
        rootDir,
        feature: 'support-inbox',
        queryName: 'list-tickets',
        sql: 'tmp/list-tickets.sql',
      });

      const importedSql = readFileSync(path.join(rootDir, 'src/features/support-inbox/queries/list-tickets/list-tickets.sql'), 'utf8');
      const queryContract = readFileSync(path.join(rootDir, 'src/features/support-inbox/queries/list-tickets/query.ts'), 'utf8');
      const analysisPath = path.join(rootDir, 'src/features/support-inbox/queries/list-tickets/tests/generated/analysis.json');
      const analysis = JSON.parse(readFileSync(analysisPath, 'utf8')) as {
        anchorSource?: string;
        anchorTable?: string;
        table?: string;
        physicalTables?: string[];
        status?: string;
        mappingCaseSignature?: {
          anchorSource?: string;
          anchorTable?: string;
          physicalTables?: string[];
        };
      };

      expect(result.formatted).toBe(true);
      expect(result.formatSkippedReason).toBeUndefined();
      expect(importedSql).toContain('from\n            public.tickets as t');
      expect(importedSql).toContain('inner join public.customers as c');
      expect(queryContract).toContain('created_at: string | null;');
      expect(queryContract).toContain('customer_name: string | null;');
      expect(queryContract).toContain('subject: string | null;');
      expect(analysis).toMatchObject({
        anchorSource: 'ticket_view',
        anchorTable: 'public.tickets',
        table: 'public.tickets',
        status: 'generated-from-imported-sql',
      });
      expect(analysis.physicalTables).toEqual(['public.customers', 'public.tickets']);
      expect(analysis.mappingCaseSignature).toMatchObject({
        anchorSource: 'ticket_view',
        anchorTable: 'public.tickets',
        physicalTables: ['public.customers', 'public.tickets'],
      });
    } finally {
      rmSync(rootDir, { recursive: true, force: true });
    }
  });

  test('imports SQL with implicit aliases when formatting preserves AST and named parameters', () => {
    const rootDir = mkdtempSync(path.join(tmpdir(), 'ashiba-feature-import-relaxed-format-'));

    try {
      mkdirSync(path.join(rootDir, 'db', 'ddl'), { recursive: true });
      mkdirSync(path.join(rootDir, 'tmp'), { recursive: true });
      writeFileSync(path.join(rootDir, 'db', 'ddl', 'public.sql'), [
        'create table public.users (',
        '  user_id integer primary key,',
        '  email text not null',
        ');',
        '',
      ].join('\n'), 'utf8');
      writeFileSync(path.join(rootDir, 'tmp', 'search-users.sql'), [
        'select u.user_id, u.email',
        'from public.users u',
        'where u.email = :email',
        'order by u.user_id;',
        '',
      ].join('\n'), 'utf8');

      const result = runFeatureImport({
        rootDir,
        feature: 'users-search',
        queryName: 'search',
        sql: 'tmp/search-users.sql',
      });

      const importedSql = readFileSync(path.join(rootDir, 'src/features/users-search/queries/search/search.sql'), 'utf8');
      const queryBoundary = readFileSync(path.join(rootDir, 'src/features/users-search/queries/search/query.ts'), 'utf8');

      expect(result.formatted).toBe(true);
      expect(result.formatSkippedReason).toBeUndefined();
      expect(importedSql).toContain('from\n    public.users as u');
      expect(importedSql).toContain('u.email = :email');
      expect(queryBoundary).toContain('email: string;');
    } finally {
      rmSync(rootDir, { recursive: true, force: true });
    }
  });

  test('keeps imported SQL unformatted when formatting would drop comments', () => {
    const rootDir = mkdtempSync(path.join(tmpdir(), 'ashiba-feature-import-comment-safe-'));

    try {
      mkdirSync(path.join(rootDir, 'db', 'ddl'), { recursive: true });
      mkdirSync(path.join(rootDir, 'tmp'), { recursive: true });
      writeFileSync(path.join(rootDir, 'db', 'ddl', 'public.sql'), [
        'create table public.users (',
        '  user_id integer primary key',
        ');',
        '',
      ].join('\n'), 'utf8');
      writeFileSync(path.join(rootDir, 'tmp', 'users.sql'), [
        'select user_id -- keep this review note',
        'from public.users;',
        '',
      ].join('\n'), 'utf8');

      const result = runFeatureImport({
        rootDir,
        feature: 'users-list',
        queryName: 'list',
        sql: 'tmp/users.sql',
      });

      const importedSql = readFileSync(path.join(rootDir, 'src/features/users-list/queries/list/list.sql'), 'utf8');

      expect(result.formatted).toBe(false);
      expect(result.formatSkippedReason).toContain('SQL comments would be dropped');
      expect(importedSql).toContain('-- keep this review note');
      expect(importedSql).toContain('select user_id');
    } finally {
      rmSync(rootDir, { recursive: true, force: true });
    }
  });

  test('imports timestamp result columns with valid PostgreSQL mapper probe fixtures', () => {
    const rootDir = mkdtempSync(path.join(tmpdir(), 'ashiba-feature-import-timestamp-fixture-'));

    try {
      mkdirSync(path.join(rootDir, 'db', 'ddl'), { recursive: true });
      mkdirSync(path.join(rootDir, 'tmp'), { recursive: true });
      writeFileSync(path.join(rootDir, 'db', 'ddl', 'public.sql'), [
        'create table public.tickets (',
        '  ticket_id integer primary key,',
        '  created_at timestamptz not null',
        ');',
        '',
      ].join('\n'), 'utf8');
      writeFileSync(path.join(rootDir, 'tmp', 'list-tickets.sql'), [
        'select ticket_id, created_at',
        'from public.tickets',
        'where ticket_id = :ticket_id;',
        '',
      ].join('\n'), 'utf8');

      runFeatureImport({
        rootDir,
        feature: 'tickets-list',
        queryName: 'list',
        sql: 'tmp/list-tickets.sql',
      });

      const mappingCases = readFileSync(path.join(rootDir, 'src/features/tickets-list/queries/list/tests/generated/mapping.cases.ts'), 'utf8');

      expect(mappingCases).toContain("cast('2026-01-01T00:00:00.000Z' as timestamptz)");
      expect(mappingCases).not.toContain("cast('created_at-1' as timestamptz)");
    } finally {
      rmSync(rootDir, { recursive: true, force: true });
    }
  });

  test('respects customer-owned DTO nullability when imported SQL nullability is uncertain', () => {
    const rootDir = mkdtempSync(path.join(tmpdir(), 'ashiba-feature-import-code-is-yours-'));

    try {
      mkdirSync(path.join(rootDir, 'db', 'ddl'), { recursive: true });
      mkdirSync(path.join(rootDir, 'tmp'), { recursive: true });
      writeFileSync(path.join(rootDir, 'tmp', 'status.sql'), [
        "select upper('ready') as status_text, cast(null as text) as message;",
        '',
      ].join('\n'), 'utf8');

      runFeatureImport({
        rootDir,
        feature: 'status-read',
        queryName: 'status',
        sql: 'tmp/status.sql',
      });

      const queryPath = path.join(rootDir, 'src/features/status-read/queries/status/query.ts');
      const mappingPath = path.join(rootDir, 'src/features/status-read/queries/status/tests/generated/mapping.cases.ts');

      expect(readFileSync(queryPath, 'utf8')).toContain('status_text: string | null;');
      expect(readFileSync(queryPath, 'utf8')).toContain('message: string | null;');
      expect(readFileSync(mappingPath, 'utf8')).toContain('nullable-output-mapping');

      writeFileSync(
        queryPath,
        readFileSync(queryPath, 'utf8').replace('status_text: string | null;', 'status_text: string;'),
        'utf8',
      );

      const result = runFeatureGeneratedMapperCheck({ rootDir, feature: 'status-read', query: 'status' });

      expect(result.ok).toBe(true);
      expect(result.checked[0]?.mismatchedResultTypes).toEqual([]);
      expect(result.checked[0]?.warningResultTypeMismatches).toEqual([
        "status_text: mapper string / SQL string | null (nullability unknown; customer-owned DTO is narrower than Ashiba's conservative import contract)",
      ]);

      const warningOnlyProject = runProjectCheck({ rootDir });
      expect(warningOnlyProject.ok).toBe(true);
      expect(warningOnlyProject.warnings.map((issue) => issue.code)).toContain('ASHIBA_PROJECT_GENERATED_MAPPER_RESULT_INFERENCE_WARNING');

      writeFileSync(
        queryPath,
        readFileSync(queryPath, 'utf8').replace('message: string | null;', 'message: string;'),
        'utf8',
      );

      const criticalResult = runFeatureGeneratedMapperCheck({ rootDir, feature: 'status-read', query: 'status' });
      const criticalProject = runProjectCheck({ rootDir });

      expect(criticalResult.ok).toBe(false);
      expect(criticalResult.checked[0]?.mismatchedResultTypes).toEqual([
        'message: mapper string / SQL string | null',
      ]);
      expect(criticalProject.ok).toBe(false);
      expect(criticalProject.errors.map((issue) => issue.code)).toContain('ASHIBA_PROJECT_GENERATED_MAPPER_DRIFT');
    } finally {
      rmSync(rootDir, { recursive: true, force: true });
    }
  });

  test('imports expression SQL and still generates FROM-less mapper probes without a root table', () => {
    const rootDir = mkdtempSync(path.join(tmpdir(), 'ashiba-feature-import-expression-sql-'));

    try {
      mkdirSync(path.join(rootDir, 'tmp'), { recursive: true });
      writeFileSync(path.join(rootDir, 'tmp', 'health.sql'), [
        "select cast(1 as bigint) as status_code, cast(2.5 as numeric(10, 2)) as ratio, cast(null as text) as message;",
        '',
      ].join('\n'), 'utf8');

      runFeatureImport({
        rootDir,
        feature: 'health-check',
        queryName: 'readiness',
        sql: 'tmp/health.sql',
      });

      const queryBoundary = readFileSync(path.join(rootDir, 'src/features/health-check/queries/readiness/query.ts'), 'utf8');
      const ztdTypesPath = path.join(rootDir, 'src/features/health-check/queries/readiness/tests/boundary-ztd-types.ts');
      const mappingPath = path.join(rootDir, 'src/features/health-check/queries/readiness/tests/generated/mapping.cases.ts');
      const analysisPath = path.join(rootDir, 'src/features/health-check/queries/readiness/tests/generated/analysis.json');
      const ztdTypes = readFileSync(ztdTypesPath, 'utf8');
      const mappingCases = readFileSync(mappingPath, 'utf8');

      expect(queryBoundary).toContain('status_code: string;');
      expect(queryBoundary).toContain('ratio: string | null;');
      expect(queryBoundary).toContain('message: string | null;');
      expect(ztdTypes).toContain('Record<string, unknown>');
      expect(mappingCases).toContain('mapperProbe');
      expect(mappingCases).toContain('beforeDb: {}');
      expect(mappingCases).toContain('cast(\'1\' as bigint) as \\"status_code\\"');
      expect(mappingCases).toContain('cast(\'1.25\' as numeric(10, 2)) as \\"ratio\\"');
      expect(mappingCases).not.toContain('cast(\'value\' as bigint)');
      expect(mappingCases).not.toContain('cast(\'value\' as numeric');
      expect(mappingCases).toContain('cast(null as text) as \\"message\\"');

      rmSync(mappingPath, { force: true });
      rmSync(analysisPath, { force: true });
      const missing = runFeatureTestsCheck({ rootDir, feature: 'health-check', query: 'readiness' });
      const fixed = runFeatureTestsCheck({ rootDir, feature: 'health-check', query: 'readiness', fix: true });

      expect(missing.ok).toBe(false);
      expect(missing.checked[0]?.issues.length).toBeGreaterThan(0);
      expect(fixed.ok).toBe(true);
      expect(readFileSync(mappingPath, 'utf8')).toContain('mapperProbe');
      expect(JSON.parse(readFileSync(analysisPath, 'utf8'))).toMatchObject({
        importSource: 'existing-sql',
        status: 'generated-from-imported-sql-without-root-table',
      });

      rmSync(mappingPath, { force: true });
      rmSync(analysisPath, { force: true });
      const scaffold = runFeatureTestsScaffold({ rootDir, feature: 'health-check', query: 'readiness', force: true });

      expect(scaffold.outputs.map((file) => file.path)).toEqual(expect.arrayContaining([
        'src/features/health-check/queries/readiness/tests/generated/mapping.cases.ts',
        'src/features/health-check/queries/readiness/tests/generated/analysis.json',
      ]));
      expect(readFileSync(mappingPath, 'utf8')).toContain('mapperProbe');
      expect(JSON.parse(readFileSync(analysisPath, 'utf8'))).toMatchObject({
        importSource: 'existing-sql',
        status: 'generated-from-imported-sql-without-root-table',
      });
    } finally {
      rmSync(rootDir, { recursive: true, force: true });
    }
  });

  test('refreshes generated query metadata after SQL-only edits', () => {
    const rootDir = mkdtempSync(path.join(tmpdir(), 'ashiba-feature-query-refresh-'));

    try {
      mkdirSync(path.join(rootDir, 'db', 'ddl'), { recursive: true });
      writeFileSync(path.join(rootDir, 'db', 'ddl', 'public.sql'), [
        'create table public.users (',
        '  user_id integer primary key,',
        '  email text not null',
        ');',
        '',
      ].join('\n'), 'utf8');
      runFeatureScaffold({ rootDir, table: 'users', action: 'list' });
      const sqlPath = path.join(rootDir, 'src/features/users-list/queries/list/list.sql');
      const sqlSourcePath = path.join(rootDir, 'src/features/users-list/queries/list/generated/query.sql.ts');
      writeFileSync(sqlPath, `${readFileSync(sqlPath, 'utf8')}\n-- SQL-only metadata refresh smoke\n`, 'utf8');

      const stale = runCheckContract({ rootDir, feature: 'users-list' });
      expect(stale.ok).toBe(false);
      expect(stale.catalogCheck.checked[0]?.issues).toContain('queryModel.analysis.sourceHash is stale.');
      expect(readFileSync(sqlSourcePath, 'utf8')).not.toContain('SQL-only metadata refresh smoke');

      const refresh = runFeatureQueryMetadataRefresh({ rootDir, feature: 'users-list', query: 'list' });
      expect(refresh.changed).toBe(true);
      expect(refresh.queryFile).toBe('src/features/users-list/queries/list/query.ts');
      expect(refresh.metadataFile).toBe('src/features/users-list/queries/list/generated/query.meta.ts');
      expect(refresh.sqlSourceFile).toBe('src/features/users-list/queries/list/generated/query.sql.ts');
      expect(readFileSync(sqlSourcePath, 'utf8')).toContain('SQL-only metadata refresh smoke');

      const fresh = runCheckContract({ rootDir, feature: 'users-list' });
      expect(fresh.ok).toBe(true);
    } finally {
      rmSync(rootDir, { recursive: true, force: true });
    }
  });

  test('refreshes query metadata under configured featureRoot', () => {
    const rootDir = mkdtempSync(path.join(tmpdir(), 'ashiba-feature-query-refresh-config-root-'));

    try {
      mkdirSync(path.join(rootDir, 'db', 'ddl'), { recursive: true });
      writeFileSync(path.join(rootDir, 'ashiba.config.json'), JSON.stringify({
        featureRoot: 'src/usecases',
      }, null, 2), 'utf8');
      writeFileSync(path.join(rootDir, 'db', 'ddl', 'public.sql'), [
        'create table public.users (',
        '  user_id integer primary key,',
        '  email text not null',
        ');',
        '',
      ].join('\n'), 'utf8');
      runFeatureScaffold({ rootDir, table: 'users', action: 'list' });
      const sqlPath = path.join(rootDir, 'src/usecases/users-list/queries/list/list.sql');
      const sqlSourcePath = path.join(rootDir, 'src/usecases/users-list/queries/list/generated/query.sql.ts');
      writeFileSync(sqlPath, `${readFileSync(sqlPath, 'utf8')}\n-- SQL-only metadata refresh under configured featureRoot\n`, 'utf8');

      const stale = runCheckContract({ rootDir, featureRoot: 'src/usecases', feature: 'users-list' });
      expect(stale.ok).toBe(false);
      expect(stale.catalogCheck.checked[0]?.issues).toContain('queryModel.analysis.sourceHash is stale.');

      const refresh = runFeatureQueryMetadataRefresh({ rootDir, feature: 'users-list', query: 'list' });
      expect(refresh.changed).toBe(true);
      expect(refresh.queryFile).toBe('src/usecases/users-list/queries/list/query.ts');
      expect(refresh.metadataFile).toBe('src/usecases/users-list/queries/list/generated/query.meta.ts');
      expect(refresh.sqlSourceFile).toBe('src/usecases/users-list/queries/list/generated/query.sql.ts');
      expect(readFileSync(sqlSourcePath, 'utf8')).toContain('SQL-only metadata refresh under configured featureRoot');

      const fresh = runCheckContract({ rootDir, featureRoot: 'src/usecases', feature: 'users-list' });
      expect(fresh.ok).toBe(true);
    } finally {
      rmSync(rootDir, { recursive: true, force: true });
    }
  });

  test('scaffolds features from ashiba.config.json ddl.sourceDir', () => {
    const rootDir = mkdtempSync(path.join(tmpdir(), 'ashiba-feature-config-ddl-'));

    try {
      mkdirSync(path.join(rootDir, 'schema'), { recursive: true });
      writeFileSync(path.join(rootDir, 'ashiba.config.json'), JSON.stringify({
        ddl: { sourceDir: 'schema' },
      }, null, 2), 'utf8');
      writeFileSync(path.join(rootDir, 'schema', 'public.sql'), [
        'create table public.users (',
        '  user_id integer primary key,',
        '  email text not null',
        ');',
        '',
      ].join('\n'), 'utf8');

      const result = runFeatureScaffold({ rootDir, table: 'users', action: 'list' });

      expect(result.featureName).toBe('users-list');
      const listSql = readFileSync(path.join(rootDir, 'src/features/users-list/queries/list/list.sql'), 'utf8');
      expect(listSql).toContain('from\n    public.users');
      expect(listSql).toContain('    user_id\n    , email');
      const boundaryTest = readFileSync(path.join(rootDir, 'src/features/users-list/tests/users-list.boundary.test.ts'), 'utf8');
      expect(boundaryTest).toMatch(/expect\(params\)\.toEqual\(\{\n {8}limit: 1\n {6}\}\);/);
      expect(boundaryTest).toMatch(/return \[\{\n {8}user_id: 1,\n {8}email: "email-value"/);
      expect(boundaryTest).toMatch(/await expect\(execute\(executor, \{\n {4}limit: 1\n {2}\}\)\)\.resolves\.toEqual\(\{/);
    } finally {
      rmSync(rootDir, { recursive: true, force: true });
    }
  });

  test('formats newly scaffolded SQL using ashiba.config.json format.sql', () => {
    const rootDir = mkdtempSync(path.join(tmpdir(), 'ashiba-feature-config-format-'));

    try {
      mkdirSync(path.join(rootDir, 'db', 'ddl'), { recursive: true });
      writeFileSync(path.join(rootDir, 'ashiba.config.json'), JSON.stringify({
        format: { sql: { indentSize: 2 } },
      }, null, 2), 'utf8');
      writeFileSync(path.join(rootDir, 'db', 'ddl', 'public.sql'), [
        'create table public.users (',
        '  user_id integer primary key,',
        '  email text not null',
        ');',
        '',
      ].join('\n'), 'utf8');

      runFeatureScaffold({ rootDir, table: 'users', action: 'list' });

      const listSql = readFileSync(path.join(rootDir, 'src/features/users-list/queries/list/list.sql'), 'utf8');
      expect(listSql).toContain('select\n  user_id\n  , email');
      expect(listSql).toContain('from\n  public.users');
    } finally {
      rmSync(rootDir, { recursive: true, force: true });
    }
  });

  test('keeps required identifier quotes when formatting newly scaffolded SQL', () => {
    const rootDir = mkdtempSync(path.join(tmpdir(), 'ashiba-feature-format-quotes-'));

    try {
      mkdirSync(path.join(rootDir, 'db', 'ddl'), { recursive: true });
      writeFileSync(path.join(rootDir, 'db', 'ddl', 'public.sql'), [
        'create table public."order" (',
        '  id integer primary key,',
        '  "select" text not null,',
        '  "current_user" text,',
        '  "UserName" text',
        ');',
        '',
      ].join('\n'), 'utf8');

      runFeatureScaffold({ rootDir, table: 'order', action: 'list' });

      const listSql = readFileSync(path.join(rootDir, 'src/features/order-list/queries/list/list.sql'), 'utf8');
      expect(listSql).toContain('    id\n    , "select"\n    , "current_user"\n    , "UserName"');
      expect(listSql).toContain('from\n    public."order"');
      expect(listSql).toContain('order by\n    id');
    } finally {
      rmSync(rootDir, { recursive: true, force: true });
    }
  });

  test('supports subgrouped feature boundaries with root-stable shared imports', () => {
    const rootDir = mkdtempSync(path.join(tmpdir(), 'ashiba-feature-subgroup-'));

    try {
      mkdirSync(path.join(rootDir, 'db', 'ddl'), { recursive: true });
      writeFileSync(path.join(rootDir, 'db', 'ddl', 'public.sql'), [
        'create table public.users (',
        '  user_id integer primary key,',
        '  email text not null',
        ');',
        '',
      ].join('\n'), 'utf8');
      const boundaryDir = 'src/features/orders/write/users-insert';
      mkdirSync(path.join(rootDir, boundaryDir), { recursive: true });
      writeFileSync(path.join(rootDir, boundaryDir, 'boundary.ts'), 'export async function execute(): Promise<void> {}\n', 'utf8');

      const queryResult = runFeatureQueryScaffold({
        rootDir,
        boundaryDir,
        queryName: 'get-user',
        table: 'users',
        action: 'get-by-id',
      });
      const testsResult = runFeatureTestsScaffold({ rootDir, boundaryDir });
      const checkResult = runFeatureGeneratedMapperCheck({ rootDir, boundaryDir });

      const queryBoundary = readFileSync(path.join(rootDir, boundaryDir, 'queries/get-user/query.ts'), 'utf8');
      const querySqlSource = readFileSync(path.join(rootDir, boundaryDir, 'queries/get-user/generated/query.sql.ts'), 'utf8');
      const ztdTest = readFileSync(path.join(rootDir, boundaryDir, 'queries/get-user/tests/get-user.boundary.ztd.test.ts'), 'utf8');

      expect(queryResult.featureName).toBe('users-insert');
      expect(testsResult.outputs.some((output) => output.path.endsWith('orders/write/users-insert/queries/get-user/tests/generated/TEST_PLAN.md'))).toBe(true);
      expect(checkResult.checked[0]?.feature).toBe('users-insert');
      expect(checkResult.checked[0]?.sqlFile).toBe('src/features/orders/write/users-insert/queries/get-user/get-user.sql');
      expect(queryBoundary).toContain("from '#features/_shared/featureQueryExecutor.js'");
      expect(queryBoundary).toContain("from './generated/query.sql.js'");
      expect(queryBoundary).not.toContain("from '#features/_shared/loadSqlResource.js'");
      expect(querySqlSource).toContain('export const querySql =');
      expect(queryBoundary).toContain("import { queryOneOrNull, type FeatureQueryExecutor } from '#features/_shared/featureQueryExecutor.js';");
      expect(queryBoundary).toContain('return queryOneOrNull<QueryRow>(executor, getUserQuery, params as unknown as Record<string, unknown>);');
      expect(ztdTest).toContain("from '#tests/support/ztd/harness.js'");
    } finally {
      rmSync(rootDir, { recursive: true, force: true });
    }
  });

  test('scaffolds query-local ZTD test cases and generated analysis files', () => {
    const rootDir = mkdtempSync(path.join(tmpdir(), 'ashiba-feature-tests-'));

    try {
      mkdirSync(path.join(rootDir, 'db', 'ddl'), { recursive: true });
      writeFileSync(path.join(rootDir, 'db', 'ddl', 'public.sql'), 'create table public.users (user_id integer primary key, email text not null);', 'utf8');
      runFeatureScaffold({ rootDir, table: 'users', action: 'list' });

      const result = runFeatureTestsScaffold({ rootDir, feature: 'users-list' });

      expect(result.outputs.some((output) => output.path.endsWith('generated/TEST_PLAN.md'))).toBe(true);
      expect(readFileSync(path.join(rootDir, 'src/features/users-list/queries/list/tests/generated/TEST_PLAN.md'), 'utf8')).toContain('library-owned');
      expect(readFileSync(path.join(rootDir, 'src/features/users-list/queries/list/tests/list.boundary.ztd.test.ts'), 'utf8')).toContain('runQuerySpecZtdCases');
      expect(readFileSync(path.join(rootDir, 'src/features/users-list/queries/list/tests/generated/mapping.cases.ts'), 'utf8')).toContain('db-type-mapping');
      expect(readFileSync(path.join(rootDir, 'src/features/users-list/queries/list/tests/generated/mapping.cases.ts'), 'utf8')).toContain('boundary-value-mapping');
      expect(readFileSync(path.join(rootDir, 'src/features/users-list/queries/list/tests/cases/logic.case.ts'), 'utf8')).toContain('Human/AI-owned SQL logic cases');
    } finally {
      rmSync(rootDir, { recursive: true, force: true });
    }
  });

  test('detects and fixes generated mapping test drift without overwriting logic cases', () => {
    const rootDir = mkdtempSync(path.join(tmpdir(), 'ashiba-feature-tests-check-'));

    try {
      mkdirSync(path.join(rootDir, 'db', 'ddl'), { recursive: true });
      writeFileSync(path.join(rootDir, 'db', 'ddl', 'public.sql'), [
        'create table public.users (',
        '  user_id bigserial primary key,',
        '  email text not null,',
        '  display_name text',
        ');',
        '',
      ].join('\n'), 'utf8');
      runFeatureScaffold({ rootDir, table: 'users', action: 'list' });
      const mappingPath = path.join(rootDir, 'src/features/users-list/queries/list/tests/generated/mapping.cases.ts');
      const logicPath = path.join(rootDir, 'src/features/users-list/queries/list/tests/cases/logic.case.ts');
      writeFileSync(mappingPath, 'drifted\n', 'utf8');
      writeFileSync(logicPath, 'human logic stays\n', 'utf8');

      const failed = runFeatureTestsCheck({ rootDir, feature: 'users-list' });
      const fixed = runFeatureTestsCheck({ rootDir, feature: 'users-list', fix: true });

      expect(failed.ok).toBe(false);
      expect(failed.checked[0]?.issues.some((issue) => issue.includes('Drifted generated mapping test asset'))).toBe(true);
      expect(fixed.ok).toBe(true);
      expect(readFileSync(mappingPath, 'utf8')).toContain('nullable-output-mapping');
      expect(readFileSync(logicPath, 'utf8')).toBe('human logic stays\n');
    } finally {
      rmSync(rootDir, { recursive: true, force: true });
    }
  });

  test('detects and fixes DDL-driven generated mapping test drift', () => {
    const rootDir = mkdtempSync(path.join(tmpdir(), 'ashiba-feature-ddl-drift-'));

    try {
      const ddlPath = path.join(rootDir, 'db', 'ddl', 'public.sql');
      mkdirSync(path.dirname(ddlPath), { recursive: true });
      writeFileSync(ddlPath, [
        'create table public.users (',
        '  user_id bigserial primary key,',
        '  email text not null,',
        '  display_name text',
        ');',
        '',
      ].join('\n'), 'utf8');
      runFeatureScaffold({ rootDir, table: 'users', action: 'list' });
      const mappingPath = path.join(rootDir, 'src/features/users-list/queries/list/tests/generated/mapping.cases.ts');
      const logicPath = path.join(rootDir, 'src/features/users-list/queries/list/tests/cases/logic.case.ts');
      writeFileSync(logicPath, 'human logic stays\n', 'utf8');
      expect(readFileSync(mappingPath, 'utf8')).toContain('nullable-output-mapping');

      writeFileSync(ddlPath, [
        'create table public.users (',
        '  user_id bigserial primary key,',
        '  email text not null,',
        '  display_name text not null',
        ');',
        '',
      ].join('\n'), 'utf8');
      const failed = runFeatureTestsCheck({ rootDir, feature: 'users-list' });
      const fixed = runFeatureTestsCheck({ rootDir, feature: 'users-list', fix: true });

      expect(failed.ok).toBe(false);
      expect(failed.checked[0]?.issues.some((issue) => issue.includes('Drifted generated mapping test asset'))).toBe(true);
      expect(fixed.ok).toBe(true);
      expect(readFileSync(mappingPath, 'utf8')).not.toContain('nullable-output-mapping');
      expect(readFileSync(logicPath, 'utf8')).toBe('human logic stays\n');
    } finally {
      rmSync(rootDir, { recursive: true, force: true });
    }
  });

  test('fills missing generated mapping test assets from SQL and DDL metadata', () => {
    const rootDir = mkdtempSync(path.join(tmpdir(), 'ashiba-feature-tests-fill-'));

    try {
      mkdirSync(path.join(rootDir, 'db', 'ddl'), { recursive: true });
      writeFileSync(path.join(rootDir, 'db', 'ddl', 'public.sql'), [
        'create table public.users (',
        '  user_id bigserial primary key,',
        '  email text not null',
        ');',
        '',
      ].join('\n'), 'utf8');
      runFeatureScaffold({ rootDir, table: 'users', action: 'insert' });
      const generatedDir = path.join(rootDir, 'src/features/users-insert/queries/insert-users/tests/generated');
      const mappingPath = path.join(generatedDir, 'mapping.cases.ts');
      const analysisPath = path.join(generatedDir, 'analysis.json');
      const logicPath = path.join(rootDir, 'src/features/users-insert/queries/insert-users/tests/cases/logic.case.ts');
      writeFileSync(logicPath, 'human logic stays\n', 'utf8');
      rmSync(mappingPath, { force: true });
      rmSync(analysisPath, { force: true });

      const failed = runFeatureTestsCheck({ rootDir, feature: 'users-insert' });
      const fixed = runFeatureTestsCheck({ rootDir, feature: 'users-insert', fix: true });

      expect(failed.ok).toBe(false);
      expect(failed.checked[0]?.issues.some((issue) => issue.includes('Missing or unreadable generated mapping test analysis'))).toBe(true);
      expect(failed.checked[0]?.issues.some((issue) => issue.includes('Missing generated mapping test asset'))).toBe(true);
      expect(fixed.ok).toBe(true);
      expect(readFileSync(mappingPath, 'utf8')).toContain('mapperProbe');
      expect(readFileSync(mappingPath, 'utf8')).toContain('maps insert-users DB result values into the DTO');
      expect(JSON.parse(readFileSync(analysisPath, 'utf8')).action).toBe('insert');
      expect(readFileSync(logicPath, 'utf8')).toBe('human logic stays\n');
    } finally {
      rmSync(rootDir, { recursive: true, force: true });
    }
  });

  test('checks generated mapper drift between SQL parameters and editable boundary contracts', () => {
    const rootDir = mkdtempSync(path.join(tmpdir(), 'ashiba-generated-mapper-check-'));

    try {
      mkdirSync(path.join(rootDir, 'db', 'ddl'), { recursive: true });
      writeFileSync(path.join(rootDir, 'db', 'ddl', 'public.sql'), 'create table public.users (user_id integer primary key, email text not null);', 'utf8');
      runFeatureScaffold({ rootDir, table: 'users', action: 'insert' });

      const pass = runFeatureGeneratedMapperCheck({ rootDir, feature: 'users-insert' });
      expect(pass.ok).toBe(true);

      const sqlPath = path.join(rootDir, 'src/features/users-insert/queries/insert-users/insert-users.sql');
      writeFileSync(sqlPath, readFileSync(sqlPath, 'utf8').replace(':email', ':new_email'), 'utf8');
      const fail = runFeatureGeneratedMapperCheck({ rootDir, feature: 'users-insert', query: 'insert-users' });

      expect(fail.ok).toBe(false);
      expect(fail.checked[0]?.missingInMapper).toEqual(['new_email']);
      expect(fail.checked[0]?.unusedInMapper).toEqual(['email']);
      expect(fail.checked[0]?.missingResultInMapper).toEqual([]);
    } finally {
      rmSync(rootDir, { recursive: true, force: true });
    }
  });

  test('checks result column drift for editable generated mapper contracts', () => {
    const rootDir = mkdtempSync(path.join(tmpdir(), 'ashiba-generated-result-check-'));

    try {
      mkdirSync(path.join(rootDir, 'db', 'ddl'), { recursive: true });
      writeFileSync(path.join(rootDir, 'db', 'ddl', 'public.sql'), 'create table public.users (user_id integer primary key, email text not null);', 'utf8');
      runFeatureScaffold({ rootDir, table: 'users', action: 'list' });

      const pass = runFeatureGeneratedMapperCheck({ rootDir, feature: 'users-list' });
      expect(pass.ok).toBe(true);
      expect(pass.checked[0]?.sqlParameters).toEqual(['limit']);

      const queryPath = path.join(rootDir, 'src/features/users-list/queries/list/query.ts');
      writeFileSync(queryPath, readFileSync(queryPath, 'utf8').replace('email: string;', 'email_address: string;'), 'utf8');
      const fail = runFeatureGeneratedMapperCheck({ rootDir, feature: 'users-list', query: 'list' });

      expect(fail.ok).toBe(false);
      expect(fail.checked[0]?.missingResultInMapper).toEqual(['email']);
      expect(fail.checked[0]?.unusedResultInMapper).toEqual(['email_address']);
    } finally {
      rmSync(rootDir, { recursive: true, force: true });
    }
  });

  test('runs top-level contract checks through feature generated mapper drift detection', () => {
    const rootDir = mkdtempSync(path.join(tmpdir(), 'ashiba-check-contract-'));

    try {
      mkdirSync(path.join(rootDir, 'db', 'ddl'), { recursive: true });
      writeFileSync(path.join(rootDir, 'db', 'ddl', 'public.sql'), 'create table public.users (user_id integer primary key, email text not null);', 'utf8');
      runFeatureScaffold({ rootDir, table: 'users', action: 'insert' });

      const result = runCheckContract({ rootDir, feature: 'users-insert' });

      expect(result.ok).toBe(true);
      expect(result.attainment).toMatchObject({
        overall: 'done',
        mapper: 'done',
      });
      expect(result.mapperCheck.checked[0]?.query).toBe('insert-users');
      expect(formatCheckContractResult(result)).toContain('result columns: ok');
    } finally {
      rmSync(rootDir, { recursive: true, force: true });
    }
  });

  test('reports result column drift in top-level contract check text output', () => {
    const rootDir = mkdtempSync(path.join(tmpdir(), 'ashiba-check-contract-result-drift-'));

    try {
      mkdirSync(path.join(rootDir, 'db', 'ddl'), { recursive: true });
      writeFileSync(path.join(rootDir, 'db', 'ddl', 'public.sql'), 'create table public.users (user_id integer primary key, email text not null);', 'utf8');
      runFeatureScaffold({ rootDir, table: 'users', action: 'list' });

      const queryPath = path.join(rootDir, 'src/features/users-list/queries/list/query.ts');
      writeFileSync(queryPath, readFileSync(queryPath, 'utf8').replace('email: string;', 'email_address: string;'), 'utf8');

      const result = runCheckContract({ rootDir, feature: 'users-list', query: 'list' });
      const text = formatCheckContractResult(result);

      expect(result.ok).toBe(false);
      expect(result.attainment).toMatchObject({
        overall: 'partial',
        mapper: 'partial',
      });
      expect(result.attainment.nextActions).toContain('Update editable query boundary row contracts to match visible SQL result columns.');
      expect(text).toContain('Attainment: partial');
      expect(text).toContain('Next: Update editable query boundary row contracts to match visible SQL result columns.');
      expect(text).toContain('named parameters: ok');
      expect(text).toContain('missing result in mapper: email');
      expect(text).toContain('unused result in mapper: email_address');
    } finally {
      rmSync(rootDir, { recursive: true, force: true });
    }
  });

  test('checks generated mapper drift between DDL-backed SQL parameter types and editable boundary contracts', () => {
    const rootDir = mkdtempSync(path.join(tmpdir(), 'ashiba-generated-mapper-type-check-'));

    try {
      const ddlPath = path.join(rootDir, 'db', 'ddl', 'public.sql');
      mkdirSync(path.dirname(ddlPath), { recursive: true });
      writeFileSync(ddlPath, 'create table public.users (user_id integer primary key, email text not null);', 'utf8');
      runFeatureScaffold({ rootDir, table: 'users', action: 'insert' });

      const pass = runFeatureGeneratedMapperCheck({ rootDir, feature: 'users-insert' });
      expect(pass.ok).toBe(true);
      expect(pass.checked[0]?.sqlParameterTypes).toEqual({ email: 'string', user_id: 'number' });

      writeFileSync(ddlPath, 'create table public.users (user_id integer primary key, email integer not null);', 'utf8');
      const fail = runFeatureGeneratedMapperCheck({ rootDir, feature: 'users-insert', query: 'insert-users' });

      expect(fail.ok).toBe(false);
      expect(fail.checked[0]?.mismatchedParameterTypes).toEqual(['email: mapper string / SQL number']);
    } finally {
      rmSync(rootDir, { recursive: true, force: true });
    }
  });

  test('project check passes when no project surfaces exist', () => {
    const rootDir = mkdtempSync(path.join(tmpdir(), 'ashiba-project-check-empty-'));

    try {
      const result = runProjectCheck({ rootDir });

      expect(result.kind).toBe('project-check');
      expect(result.ok).toBe(true);
      expect(result.errors).toEqual([]);
      expect(result.warnings).toEqual([]);
      expect(result.checks.contract?.ok).toBe(true);
      expect(result.checks.featureTests).toBeUndefined();
      expect(result.checks.generatedMapper).toBeUndefined();
      expect(formatProjectCheckResult(result)).toContain('Ashiba project check: ok');
    } finally {
      rmSync(rootDir, { recursive: true, force: true });
    }
  });

  test('project check fails duplicate table definitions across DDL files', () => {
    const rootDir = mkdtempSync(path.join(tmpdir(), 'ashiba-project-check-duplicate-ddl-'));

    try {
      mkdirSync(path.join(rootDir, 'db', 'ddl'), { recursive: true });
      writeFileSync(path.join(rootDir, 'db', 'ddl', 'users-a.sql'), 'create table public.users (user_id integer primary key);', 'utf8');
      writeFileSync(path.join(rootDir, 'db', 'ddl', 'users-b.sql'), 'create table public.users (user_id integer primary key, email text);', 'utf8');

      const result = runProjectCheck({ rootDir });

      expect(result.ok).toBe(false);
      expect(result.errors).toEqual(expect.arrayContaining([
        expect.objectContaining({
          code: 'ASHIBA_DDL_DUPLICATE_TABLE',
          file: 'db/ddl/users-b.sql',
          table: 'public.users',
        }),
      ]));
      expect(result.warnings).toEqual(expect.arrayContaining([
        expect.objectContaining({ code: 'ASHIBA_DDL_UNSTABLE_TABLE_OWNERSHIP' }),
      ]));
    } finally {
      rmSync(rootDir, { recursive: true, force: true });
    }
  });

  test('project check reports unparsable DDL files as diagnostics', () => {
    const rootDir = mkdtempSync(path.join(tmpdir(), 'ashiba-project-check-bad-ddl-'));

    try {
      mkdirSync(path.join(rootDir, 'db', 'ddl'), { recursive: true });
      writeFileSync(path.join(rootDir, 'db', 'ddl', 'broken.sql'), 'create table ;', 'utf8');

      const result = runProjectCheck({ rootDir });

      expect(result.ok).toBe(false);
      expect(result.errors).toEqual(expect.arrayContaining([
        expect.objectContaining({
          code: 'ASHIBA_DDL_PARSE_FAILED',
          file: 'db/ddl/broken.sql',
        }),
      ]));
    } finally {
      rmSync(rootDir, { recursive: true, force: true });
    }
  });

  test('project check discovers recursive DDL files in stable order', () => {
    const rootDir = mkdtempSync(path.join(tmpdir(), 'ashiba-project-check-recursive-ddl-'));

    try {
      mkdirSync(path.join(rootDir, 'db', 'ddl', 'accounting'), { recursive: true });
      writeFileSync(path.join(rootDir, 'db', 'ddl', 'users.sql'), 'create table public.users (user_id integer primary key);', 'utf8');
      writeFileSync(path.join(rootDir, 'db', 'ddl', 'accounting', 'journals.sql'), 'create table accounting.journals (journal_id integer primary key);', 'utf8');

      const result = runProjectCheck({ rootDir });

      expect(result.ok).toBe(true);
      expect(result.checks.ddlDiagnostics?.files).toEqual([
        'db/ddl/users.sql',
        'db/ddl/accounting/journals.sql',
      ]);
    } finally {
      rmSync(rootDir, { recursive: true, force: true });
    }
  });

  test('project check errors when DDL execution order alters a table before create', () => {
    const rootDir = mkdtempSync(path.join(tmpdir(), 'ashiba-project-check-ddl-order-'));

    try {
      mkdirSync(path.join(rootDir, 'db', 'ddl', 'patches'), { recursive: true });
      writeFileSync(path.join(rootDir, 'db', 'ddl', 'patches', '01-users-patch.sql'), 'alter table public.users add column email text;', 'utf8');
      writeFileSync(path.join(rootDir, 'db', 'ddl', 'users.sql'), 'create table public.users (user_id integer primary key);', 'utf8');

      const result = runProjectCheck({ rootDir });

      expect(result.ok).toBe(true);
      expect(result.errors).toEqual([]);

      rmSync(path.join(rootDir, 'db', 'ddl', 'users.sql'));
      writeFileSync(path.join(rootDir, 'db', 'ddl', 'patches', '99-users.sql'), 'create table public.users (user_id integer primary key);', 'utf8');
      const bad = runProjectCheck({ rootDir });

      expect(bad.ok).toBe(false);
      expect(bad.errors).toEqual(expect.arrayContaining([
        expect.objectContaining({
          code: 'ASHIBA_DDL_ALTER_BEFORE_CREATE',
          file: 'db/ddl/patches/01-users-patch.sql',
          table: 'public.users',
        }),
      ]));
    } finally {
      rmSync(rootDir, { recursive: true, force: true });
    }
  });

  test('does not report mapper drift when SQL and mapper result types are both unknown', () => {
    const rootDir = mkdtempSync(path.join(tmpdir(), 'ashiba-generated-unknown-result-check-'));

    try {
      const queryDir = path.join(rootDir, 'src/features/status-read/queries/status');
      mkdirSync(queryDir, { recursive: true });
      writeFileSync(path.join(queryDir, 'status.sql'), [
        'select json_build_object(\'ready\', true) as payload;',
        '',
      ].join('\n'), 'utf8');
      writeFileSync(path.join(queryDir, 'query.ts'), [
        'export interface StatusQueryParams {}',
        '',
        'export interface StatusQueryResult {',
        '  payload: unknown;',
        '}',
        '',
      ].join('\n'), 'utf8');

      const result = runFeatureGeneratedMapperCheck({ rootDir, feature: 'status-read', query: 'status' });

      expect(result.ok).toBe(true);
      expect(result.checked[0]?.sqlResultTypes).toEqual({ payload: 'unknown' });
      expect(result.checked[0]?.mapperResultTypes).toEqual({ payload: 'unknown' });
      expect(result.checked[0]?.mismatchedResultTypes).toEqual([]);
    } finally {
      rmSync(rootDir, { recursive: true, force: true });
    }
  });

  test('project check keeps quoted dots inside ALTER TABLE identifiers', () => {
    const rootDir = mkdtempSync(path.join(tmpdir(), 'ashiba-project-check-ddl-quoted-dot-'));

    try {
      mkdirSync(path.join(rootDir, 'db', 'ddl'), { recursive: true });
      writeFileSync(path.join(rootDir, 'db', 'ddl', 'public.sql'), [
        'create table public."orders.v2" (',
        '  order_id integer primary key',
        ');',
        'alter table public."orders.v2" add column status text;',
        '',
      ].join('\n'), 'utf8');

      const result = runProjectCheck({ rootDir });

      expect(result.ok).toBe(true);
      expect(result.errors).toEqual([]);
    } finally {
      rmSync(rootDir, { recursive: true, force: true });
    }
  });

  test('project check includes existing contract, feature test, and generated mapper checks', () => {
    const rootDir = mkdtempSync(path.join(tmpdir(), 'ashiba-project-check-feature-'));

    try {
      mkdirSync(path.join(rootDir, 'db', 'ddl'), { recursive: true });
      writeFileSync(path.join(rootDir, 'db', 'ddl', 'public.sql'), 'create table public.users (user_id integer primary key, email text not null);', 'utf8');
      runFeatureScaffold({ rootDir, table: 'users', action: 'list' });

      const result = runProjectCheck({ rootDir });

      expect(result.ok).toBe(true);
      expect(result.checks.contract?.ok).toBe(true);
      expect(result.checks.featureTests?.ok).toBe(true);
      expect(result.checks.generatedMapper?.ok).toBe(true);
      expect(result.checks.generatedMapper).toBe(result.checks.contract?.mapperCheck);
      expect(result.checks.lint?.ok).toBe(true);
      expect(result.checks.featureTests?.checked[0]?.query).toBe('list');
      expect(result.checks.generatedMapper?.checked[0]?.query).toBe('list');
      expect(result.durationMs).toBeGreaterThanOrEqual(0);
      expect(result.coverage).toMatchObject({
        ddlFiles: 1,
        sqlFiles: 1,
        mapperQueries: 1,
        catalogSpecs: 1,
        featureTestQueries: 1,
        lintFiles: 1,
      });
      expect(result.timings.map((timing) => timing.phase)).toEqual([
        'config',
        'ddl-model',
        'ddl-diagnostics',
        'contract',
        'feature-tests',
        'sql-lint',
      ]);
      const text = formatProjectCheckResult(result);
      expect(text).toContain('duration ms:');
      expect(text).toContain('coverage: ddlFiles=1, sqlFiles=1, mapperQueries=1, catalogSpecs=1, featureTestQueries=1, lintFiles=1');
      expect(text).toContain('timings:');
    } finally {
      rmSync(rootDir, { recursive: true, force: true });
    }
  });

  test('project check explains where humans or AI should repair DDL-driven drift', () => {
    const rootDir = mkdtempSync(path.join(tmpdir(), 'ashiba-project-check-ddl-repair-'));

    try {
      const ddlPath = path.join(rootDir, 'db', 'ddl', 'public.sql');
      mkdirSync(path.dirname(ddlPath), { recursive: true });
      writeFileSync(ddlPath, [
        'create table public.users (',
        '  user_id bigserial primary key,',
        '  email text not null,',
        '  display_name text',
        ');',
        '',
      ].join('\n'), 'utf8');
      runFeatureScaffold({ rootDir, table: 'users', action: 'list' });

      writeFileSync(ddlPath, [
        'create table public.users (',
        '  user_id bigserial primary key,',
        '  email text not null,',
        '  nickname text,',
        '  status text not null default \'active\'',
        ');',
        '',
      ].join('\n'), 'utf8');

      const result = runProjectCheck({ rootDir });
      const text = formatProjectCheckResult(result);

      expect(result.ok).toBe(false);
      expect(text).toContain('ASHIBA_PROJECT_FEATURE_TESTS_FAILED');
      expect(text).toContain('visible SQL: src/features/users-list/queries/list/list.sql');
      expect(text).toContain('editable mapper boundary: src/features/users-list/queries/list/query.ts');
      expect(text).toContain('library-owned generated mapping tests: src/features/users-list/queries/list/tests/generated');
      expect(text).toContain('have a human or AI update the visible SQL and editable mapper boundary first');
      expect(text).toContain('ashiba feature tests check users-list --query list --fix');
    } finally {
      rmSync(rootDir, { recursive: true, force: true });
    }
  });

  test('project check uses configured featureRoot and sqlRoots', () => {
    const rootDir = mkdtempSync(path.join(tmpdir(), 'ashiba-project-check-configured-roots-'));

    try {
      mkdirSync(path.join(rootDir, 'db', 'ddl'), { recursive: true });
      mkdirSync(path.join(rootDir, 'src', 'usecases', 'users-search', 'queries', 'search'), { recursive: true });
      mkdirSync(path.join(rootDir, 'src', 'shared-sql'), { recursive: true });
      writeFileSync(path.join(rootDir, 'ashiba.config.json'), JSON.stringify({
        featureRoot: 'src/usecases',
        sqlRoots: ['src/usecases', 'src/shared-sql'],
        ddl: { sourceDir: 'db/ddl' },
      }, null, 2), 'utf8');
      writeFileSync(path.join(rootDir, 'db', 'ddl', 'public.sql'), 'create table public.users (user_id integer primary key, email text not null);', 'utf8');
      mkdirSync(path.join(rootDir, 'tmp'), { recursive: true });
      writeFileSync(path.join(rootDir, 'tmp', 'search.sql'), 'select user_id, email from public.users where email = :email;', 'utf8');
      runFeatureImport({ rootDir, feature: 'users-search', queryName: 'search', sql: 'tmp/search.sql', force: true });
      writeFileSync(path.join(rootDir, 'src', 'shared-sql', 'broken.sql'), 'select missing_id from public.users;', 'utf8');

      const result = runProjectCheck({ rootDir });

      expect(result.ok).toBe(false);
      expect(result.checks.config).toEqual({
        featureRoot: 'src/usecases',
        sqlRoots: ['src/usecases', 'src/shared-sql'],
        defaultSchema: 'public',
        searchPath: ['public'],
        mutation: {
          optimisticLock: {
            versionColumn: 'version_key',
            scaffold: 'when-column-exists',
          },
        },
      });
      expect(result.coverage.mapperQueries).toBe(1);
      expect(result.checks.contract.mapperCheck.checked[0]?.queryFile).toBe('src/usecases/users-search/queries/search/query.ts');
      expect(result.errors).toEqual(expect.arrayContaining([
        expect.objectContaining({
          code: 'ASHIBA_PROJECT_SQL_LINT_FAILED',
          file: 'src/shared-sql/broken.sql',
        }),
      ]));
    } finally {
      rmSync(rootDir, { recursive: true, force: true });
    }
  });

  test('project check deduplicates lint files across overlapping sqlRoots', () => {
    const rootDir = mkdtempSync(path.join(tmpdir(), 'ashiba-project-check-overlap-roots-'));

    try {
      mkdirSync(path.join(rootDir, 'db', 'ddl'), { recursive: true });
      mkdirSync(path.join(rootDir, 'src', 'features', 'users-search', 'queries', 'search'), { recursive: true });
      writeFileSync(path.join(rootDir, 'ashiba.config.json'), JSON.stringify({
        featureRoot: 'src/features',
        sqlRoots: ['src/features', 'src/features/users-search'],
        ddl: { sourceDir: 'db/ddl' },
      }, null, 2), 'utf8');
      writeFileSync(path.join(rootDir, 'db', 'ddl', 'public.sql'), 'create table public.users (user_id integer primary key, email text not null);', 'utf8');
      writeFileSync(path.join(rootDir, 'src', 'features', 'users-search', 'queries', 'search', 'search.sql'), 'select missing_id from public.users;', 'utf8');

      const result = runProjectCheck({ rootDir });

      expect(result.coverage.lintFiles).toBe(1);
      expect(result.errors.filter((issue) => issue.code === 'ASHIBA_PROJECT_SQL_LINT_FAILED')).toHaveLength(1);
      expect(result.errors).toEqual(expect.arrayContaining([
        expect.objectContaining({
          code: 'ASHIBA_PROJECT_SQL_LINT_FAILED',
          file: 'src/features/users-search/queries/search/search.sql',
        }),
      ]));
    } finally {
      rmSync(rootDir, { recursive: true, force: true });
    }
  });

  test('project check warns when INSERT omits defaulted DDL columns', () => {
    const rootDir = mkdtempSync(path.join(tmpdir(), 'ashiba-project-check-insert-warning-'));

    try {
      mkdirSync(path.join(rootDir, 'db', 'ddl'), { recursive: true });
      writeFileSync(path.join(rootDir, 'db', 'ddl', 'public.sql'), [
        'create table public.users (',
        '  user_id serial primary key,',
        '  email text not null,',
        '  status text not null default \'active\'',
        ');',
        '',
      ].join('\n'), 'utf8');
      runFeatureScaffold({ rootDir, table: 'users', action: 'insert' });

      const result = runProjectCheck({ rootDir });
      const strictResult = runProjectCheck({ rootDir, warningsAsErrors: true });

      expect(result.ok).toBe(true);
      expect(result.warnings).toEqual(expect.arrayContaining([
        expect.objectContaining({
          code: 'ASHIBA_PROJECT_INSERT_DEFAULT_COLUMN_OMITTED',
          file: 'src/features/users-insert/queries/insert-users/insert-users.sql',
          column: 'status',
        }),
      ]));
      expect(strictResult.ok).toBe(false);
    } finally {
      rmSync(rootDir, { recursive: true, force: true });
    }
  });

  test('project check errors when INSERT omits a required DDL column without a default', () => {
    const rootDir = mkdtempSync(path.join(tmpdir(), 'ashiba-project-check-insert-error-'));

    try {
      mkdirSync(path.join(rootDir, 'db', 'ddl'), { recursive: true });
      const queryDir = path.join(rootDir, 'src/features/users-create/queries/create-user');
      mkdirSync(queryDir, { recursive: true });
      writeFileSync(path.join(rootDir, 'db', 'ddl', 'public.sql'), [
        'create table public.users (',
        '  user_id serial primary key,',
        '  email text not null,',
        '  external_account_id bigint not null',
        ');',
        '',
      ].join('\n'), 'utf8');
      writeFileSync(path.join(queryDir, 'create-user.sql'), [
        'insert into public.users (email)',
        'values (:email)',
        'returning user_id, email;',
        '',
      ].join('\n'), 'utf8');

      const result = runProjectCheck({ rootDir });

      expect(result.ok).toBe(false);
      expect(result.errors).toEqual(expect.arrayContaining([
        expect.objectContaining({
          code: 'ASHIBA_PROJECT_INSERT_REQUIRED_COLUMN_OMITTED',
          file: 'src/features/users-create/queries/create-user/create-user.sql',
          column: 'external_account_id',
        }),
      ]));
    } finally {
      rmSync(rootDir, { recursive: true, force: true });
    }
  });

  test('project check warning-only results fail only with warnings-as-errors', () => {
    const rootDir = mkdtempSync(path.join(tmpdir(), 'ashiba-project-check-warning-'));

    try {
      writeFileSync(path.join(rootDir, 'ashiba.config.json'), JSON.stringify({
        ddl: { sourceDir: 'schema' },
      }, null, 2), 'utf8');

      const defaultResult = runProjectCheck({ rootDir });
      const strictResult = runProjectCheck({ rootDir, warningsAsErrors: true });

      expect(defaultResult.ok).toBe(true);
      expect(defaultResult.errors).toEqual([]);
      expect(defaultResult.warnings).toEqual([
        expect.objectContaining({
          code: 'ASHIBA_DDL_CONFIGURED_DIR_MISSING',
          severity: 'warning',
          file: 'ashiba.config.json',
        }),
      ]);
      expect(strictResult.ok).toBe(false);
      expect(strictResult.errors).toEqual([]);
      expect(strictResult.warnings).toHaveLength(1);
    } finally {
      rmSync(rootDir, { recursive: true, force: true });
    }
  });

  test('ashiba check gives a human-first fast diagnostic entry point', () => {
    const rootDir = mkdtempSync(path.join(tmpdir(), 'ashiba-check-fast-'));

    try {
      mkdirSync(path.join(rootDir, 'db', 'ddl'), { recursive: true });
      writeFileSync(path.join(rootDir, 'db', 'ddl', 'broken.sql'), 'create table ;', 'utf8');

      const result = runAshibaCheck({ rootDir });
      const text = formatAshibaCheckResult(result);

      expect(result.kind).toBe('ashiba-check');
      expect(result.level).toBe('fast');
      expect(result.ok).toBe(false);
      expect(result.projectCheck.errors).toEqual(expect.arrayContaining([
        expect.objectContaining({ code: 'ASHIBA_DDL_PARSE_FAILED' }),
      ]));
      expect(text).toContain('Ashiba check: failed');
      expect(text).toContain('level: fast');
      expect(text).toContain('Ashiba project check: failed');
    } finally {
      rmSync(rootDir, { recursive: true, force: true });
    }
  });

  test('ashiba check --full runs mapper command after the fast check passes', () => {
    const rootDir = mkdtempSync(path.join(tmpdir(), 'ashiba-check-full-'));

    try {
      const result = runAshibaCheck({
        rootDir,
        full: true,
        mapperTestCommand: 'node -e "process.exit(0)"',
      });

      expect(result.ok).toBe(true);
      expect(result.level).toBe('full');
      expect(result.mapperTest).toMatchObject({
        command: 'node -e "process.exit(0)"',
        ok: true,
        status: 0,
      });
      expect(formatAshibaCheckResult(result)).toContain('Mapper test: ok');
    } finally {
      rmSync(rootDir, { recursive: true, force: true });
    }
  });

  test('ashiba check --full skips mapper command when fast check fails', () => {
    const rootDir = mkdtempSync(path.join(tmpdir(), 'ashiba-check-full-skip-'));

    try {
      mkdirSync(path.join(rootDir, 'db', 'ddl'), { recursive: true });
      writeFileSync(path.join(rootDir, 'db', 'ddl', 'broken.sql'), 'create table ;', 'utf8');

      const result = runAshibaCheck({
        rootDir,
        full: true,
        mapperTestCommand: 'node -e "process.exit(99)"',
      });

      expect(result.ok).toBe(false);
      expect(result.mapperTest).toBeUndefined();
      expect(formatAshibaCheckResult(result)).toContain('Mapper test: skipped');
    } finally {
      rmSync(rootDir, { recursive: true, force: true });
    }
  });

  test('gate scaffold adds passive check package scripts without hook dependencies', () => {
    const rootDir = mkdtempSync(path.join(tmpdir(), 'ashiba-gate-scripts-'));

    try {
      writeFileSync(path.join(rootDir, 'package.json'), `${JSON.stringify({
        name: 'starter',
        private: true,
        scripts: { test: 'vitest run' },
      }, null, 2)}\n`, 'utf8');

      const result = runGateScaffold({ rootDir, target: 'package-scripts' });
      const packageJson = JSON.parse(readFileSync(path.join(rootDir, 'package.json'), 'utf8')) as {
        scripts: Record<string, string>;
        devDependencies?: Record<string, string>;
      };

      expect(result.files).toEqual([{ relativePath: 'package.json', action: 'update' }]);
      expect(packageJson.scripts.test).toBe('vitest run');
      expect(packageJson.scripts['ashiba:check']).toBe('node node_modules/@ashiba-ts/cli/dist/index.js check');
      expect(packageJson.scripts['ashiba:verify']).toBe('node node_modules/@ashiba-ts/cli/dist/index.js check --full --mapper-test-command "vitest run"');
      expect(packageJson.devDependencies?.husky).toBeUndefined();
    } finally {
      rmSync(rootDir, { recursive: true, force: true });
    }
  });

  test('gate scaffold creates the standard passive gate surface with one command', () => {
    const rootDir = mkdtempSync(path.join(tmpdir(), 'ashiba-gate-files-'));

    try {
      writeFileSync(path.join(rootDir, 'package.json'), `${JSON.stringify({
        name: 'starter',
        private: true,
        scripts: { test: 'vitest run' },
      }, null, 2)}\n`, 'utf8');

      const result = runGateScaffold({ rootDir });

      expect(result.target).toBe('all');
      expect(result.files).toEqual([
        { relativePath: 'package.json', action: 'update' },
        { relativePath: '.github/workflows/ashiba-contract.yml', action: 'create' },
        { relativePath: '.githooks/pre-push', action: 'create' },
      ]);
      expect(JSON.parse(readFileSync(path.join(rootDir, 'package.json'), 'utf8')).scripts['ashiba:verify']).toBe('node node_modules/@ashiba-ts/cli/dist/index.js check --full --mapper-test-command "vitest run"');
      expect(readFileSync(path.join(rootDir, '.github', 'workflows', 'ashiba-contract.yml'), 'utf8')).toContain('npm install');
      expect(readFileSync(path.join(rootDir, '.github', 'workflows', 'ashiba-contract.yml'), 'utf8')).toContain('npm run ashiba:verify');
      expect(readFileSync(path.join(rootDir, '.githooks', 'pre-push'), 'utf8')).toContain('npm run ashiba:verify');
      expect(result.nextActions.join('\n')).toContain('git config core.hooksPath .githooks');
    } finally {
      rmSync(rootDir, { recursive: true, force: true });
    }
  });

  test('individual passive gates also create the shared verify script', () => {
    const rootDir = mkdtempSync(path.join(tmpdir(), 'ashiba-gate-single-'));

    try {
      writeFileSync(path.join(rootDir, 'package.json'), `${JSON.stringify({
        name: 'starter',
        private: true,
      }, null, 2)}\n`, 'utf8');

      const actions = runGateScaffold({ rootDir, target: 'github-actions' });
      const hooks = runGateScaffold({ rootDir, target: 'git-hooks' });
      const packageJson = JSON.parse(readFileSync(path.join(rootDir, 'package.json'), 'utf8')) as {
        scripts: Record<string, string>;
      };

      expect(actions.files).toEqual([
        { relativePath: 'package.json', action: 'update' },
        { relativePath: '.github/workflows/ashiba-contract.yml', action: 'create' },
      ]);
      expect(hooks.files).toEqual([
        { relativePath: 'package.json', action: 'update' },
        { relativePath: '.githooks/pre-push', action: 'create' },
      ]);
      expect(packageJson.scripts['ashiba:verify']).toBe('node node_modules/@ashiba-ts/cli/dist/index.js check --full --mapper-test-command "vitest run"');
      expect(readFileSync(path.join(rootDir, '.github', 'workflows', 'ashiba-contract.yml'), 'utf8')).toContain('npm run ashiba:verify');
      expect(readFileSync(path.join(rootDir, '.githooks', 'pre-push'), 'utf8')).toContain('npm run ashiba:verify');
    } finally {
      rmSync(rootDir, { recursive: true, force: true });
    }
  });

  test('gate scaffold respects pnpm package manager for passive gates', () => {
    const rootDir = mkdtempSync(path.join(tmpdir(), 'ashiba-gate-pnpm-'));

    try {
      writeFileSync(path.join(rootDir, 'package.json'), `${JSON.stringify({
        name: 'starter',
        private: true,
        packageManager: 'pnpm@10.19.0',
      }, null, 2)}\n`, 'utf8');
      writeFileSync(path.join(rootDir, 'pnpm-lock.yaml'), 'lockfileVersion: 9.0\n', 'utf8');

      runGateScaffold({ rootDir });

      expect(readFileSync(path.join(rootDir, '.github', 'workflows', 'ashiba-contract.yml'), 'utf8')).toContain('pnpm/action-setup');
      expect(readFileSync(path.join(rootDir, '.github', 'workflows', 'ashiba-contract.yml'), 'utf8')).toContain('pnpm install --frozen-lockfile');
      expect(readFileSync(path.join(rootDir, '.github', 'workflows', 'ashiba-contract.yml'), 'utf8')).toContain('pnpm ashiba:verify');
      expect(readFileSync(path.join(rootDir, '.githooks', 'pre-push'), 'utf8')).toContain('pnpm ashiba:verify');
    } finally {
      rmSync(rootDir, { recursive: true, force: true });
    }
  });

  test('gate scaffold detects pnpm from lockfile without packageManager metadata', () => {
    const rootDir = mkdtempSync(path.join(tmpdir(), 'ashiba-gate-pnpm-lock-'));

    try {
      writeFileSync(path.join(rootDir, 'package.json'), `${JSON.stringify({
        name: 'starter',
        private: true,
      }, null, 2)}\n`, 'utf8');
      writeFileSync(path.join(rootDir, 'pnpm-lock.yaml'), 'lockfileVersion: 9.0\n', 'utf8');

      runGateScaffold({ rootDir });

      expect(readFileSync(path.join(rootDir, '.github', 'workflows', 'ashiba-contract.yml'), 'utf8')).toContain('pnpm/action-setup');
      expect(readFileSync(path.join(rootDir, '.github', 'workflows', 'ashiba-contract.yml'), 'utf8')).toContain('pnpm install --frozen-lockfile');
      expect(readFileSync(path.join(rootDir, '.github', 'workflows', 'ashiba-contract.yml'), 'utf8')).toContain('pnpm ashiba:verify');
      expect(readFileSync(path.join(rootDir, '.githooks', 'pre-push'), 'utf8')).toContain('pnpm ashiba:verify');
    } finally {
      rmSync(rootDir, { recursive: true, force: true });
    }
  });

  test('checks QuerySpec-like catalog sqlFile and named parameter contracts', () => {
    const rootDir = mkdtempSync(path.join(tmpdir(), 'ashiba-check-contract-catalog-'));

    try {
      const queryDir = path.join(rootDir, 'src/features/users/queries/list');
      mkdirSync(queryDir, { recursive: true });
      writeFileSync(path.join(queryDir, 'list.sql'), 'select user_id from public.users where email = :email and status = @status;', 'utf8');
      writeFileSync(path.join(queryDir, 'list.catalog.json'), JSON.stringify({
        id: 'users.list',
        sqlFile: './list.sql',
        parameters: ['email', 'unused'],
      }), 'utf8');

      const result = runCheckContract({ rootDir, scopeDir: 'src/features/users/queries/list' });
      const text = formatCheckContractResult(result);

      expect(result.ok).toBe(false);
      expect(result.mapperCheck.checked).toEqual([]);
      expect(result.attainment).toMatchObject({
        overall: 'partial',
        mapper: 'skipped',
        catalog: 'partial',
      });
      expect(result.attainment.nextActions).toContain('Update QuerySpec parameter contracts to match visible SQL named parameters.');
      expect(result.catalogCheck.checked[0]?.missingInSpec).toEqual(['status']);
      expect(result.catalogCheck.checked[0]?.unusedInSpec).toEqual(['unused']);
      expect(text).toContain('missing in catalog: status');
      expect(text).toContain('unused in catalog: unused');
    } finally {
      rmSync(rootDir, { recursive: true, force: true });
    }
  });

  test('checks QuerySpec-like catalog result column contracts', () => {
    const rootDir = mkdtempSync(path.join(tmpdir(), 'ashiba-check-contract-catalog-results-'));

    try {
      const queryDir = path.join(rootDir, 'src/features/users/queries/list');
      mkdirSync(queryDir, { recursive: true });
      writeFileSync(path.join(queryDir, 'list.sql'), 'select user_id as id, email from public.users where email = :email;', 'utf8');
      writeFileSync(path.join(queryDir, 'list.catalog.json'), JSON.stringify({
        id: 'users.list',
        sqlFile: './list.sql',
        parameters: ['email'],
        resultColumns: ['id', 'unused'],
      }), 'utf8');

      const result = runCheckContract({ rootDir, scopeDir: 'src/features/users/queries/list' });
      const text = formatCheckContractResult(result);

      expect(result.ok).toBe(false);
      expect(result.catalogCheck.checked[0]?.missingResultInSpec).toEqual(['email']);
      expect(result.catalogCheck.checked[0]?.unusedResultInSpec).toEqual(['unused']);
      expect(text).toContain('missing result in catalog: email');
      expect(text).toContain('unused result in catalog: unused');
    } finally {
      rmSync(rootDir, { recursive: true, force: true });
    }
  });

  test('checks QuerySpec-like catalog result column type contracts', () => {
    const rootDir = mkdtempSync(path.join(tmpdir(), 'ashiba-check-contract-catalog-result-types-'));

    try {
      mkdirSync(path.join(rootDir, 'db', 'ddl'), { recursive: true });
      writeFileSync(path.join(rootDir, 'db/ddl/public.sql'), [
        'create table public.users (',
        '  user_id integer primary key,',
        '  email text not null',
        ');',
        '',
      ].join('\n'), 'utf8');
      const queryDir = path.join(rootDir, 'src/features/users/queries/list');
      mkdirSync(queryDir, { recursive: true });
      writeFileSync(path.join(queryDir, 'list.sql'), 'select user_id as id, email from public.users where email = :email;', 'utf8');
      writeFileSync(path.join(queryDir, 'list.catalog.json'), JSON.stringify({
        id: 'users.list',
        sqlFile: './list.sql',
        parameters: ['email'],
        resultColumns: ['email', 'id'],
        resultColumnTypes: {
          id: 'string',
          unused: 'boolean',
        },
      }), 'utf8');

      const result = runCheckContract({ rootDir, scopeDir: 'src/features/users/queries/list' });
      const text = formatCheckContractResult(result);

      expect(result.ok).toBe(false);
      expect(result.catalogCheck.checked[0]?.missingResultTypeInSpec).toEqual(['email']);
      expect(result.catalogCheck.checked[0]?.unusedResultTypeInSpec).toEqual(['unused']);
      expect(result.catalogCheck.checked[0]?.mismatchedResultTypeInSpec).toEqual(['id: expected string, actual number']);
      expect(text).toContain('missing result type in catalog: email');
      expect(text).toContain('unused result type in catalog: unused');
      expect(text).toContain('mismatched result type in catalog: id: expected string, actual number');
    } finally {
      rmSync(rootDir, { recursive: true, force: true });
    }
  });

  test('checks model-gen TypeScript querySpec parameter contracts', () => {
    const rootDir = mkdtempSync(path.join(tmpdir(), 'ashiba-check-contract-ts-spec-'));

    try {
      const queryDir = path.join(rootDir, 'src/features/users/queries/list');
      const sqlPath = path.join(queryDir, 'list.sql');
      const specPath = path.join(queryDir, 'list.query.ts');
      mkdirSync(queryDir, { recursive: true });
      writeFileSync(sqlPath, 'select user_id from public.users where email = :email;', 'utf8');
      runModelGen({
        rootDir,
        sqlFile: 'src/features/users/queries/list/list.sql',
        out: 'src/features/users/queries/list/list.query.ts',
      });

      const pass = runCheckContract({ rootDir, scopeDir: 'src/features/users/queries/list' });
      expect(pass.ok).toBe(true);

      writeFileSync(
        specPath,
        readFileSync(specPath, 'utf8').replace(
          '  parameters: [\n    "email"\n  ],',
          '  parameters: [\n    "email",\n    "unused"\n  ],',
        ),
        'utf8',
      );
      const fail = runCheckContract({ rootDir, scopeDir: 'src/features/users/queries/list' });

      expect(fail.ok).toBe(false);
      expect(fail.catalogCheck.checked[0]?.unusedInSpec).toEqual(['unused']);
    } finally {
      rmSync(rootDir, { recursive: true, force: true });
    }
  });

  test('checks stale query model metadata against visible SQL', () => {
    const rootDir = mkdtempSync(path.join(tmpdir(), 'ashiba-check-contract-query-model-'));

    try {
      const queryDir = path.join(rootDir, 'src/features/users/queries/list');
      const sqlPath = path.join(queryDir, 'list.sql');
      mkdirSync(queryDir, { recursive: true });
      writeFileSync(sqlPath, 'select user_id from public.users where email = :email;', 'utf8');
      runModelGen({
        rootDir,
        sqlFile: 'src/features/users/queries/list/list.sql',
        out: 'src/features/users/queries/list/list.query.ts',
      });

      expect(runCheckContract({ rootDir, scopeDir: 'src/features/users/queries/list' }).ok).toBe(true);

      writeFileSync(sqlPath, 'select user_id from public.users where email = :email and status = :status order by user_id;', 'utf8');
      const fail = runCheckContract({ rootDir, scopeDir: 'src/features/users/queries/list' });

      expect(fail.ok).toBe(false);
      expect(fail.catalogCheck.checked[0]?.issues).toEqual(expect.arrayContaining([
        'queryModel.analysis.sourceHash is stale.',
        'queryModel.analysis.hasTopLevelOrderBy is stale.',
        'queryModel.analysis.namedParameters is stale.',
        'queryModel.analysis.safeSort is stale.',
        'queryModel.bindings.postgres.sourceHash is stale.',
        'queryModel.bindings.postgres.sql is stale.',
        'queryModel.bindings.postgres.orderedNames is stale.',
      ]));
      expect(fail.attainment.nextActions).toContain('Regenerate query model metadata from the current visible SQL.');
      expect(fail.catalogCheck.checked[0]?.missingInSpec).toEqual(['status']);
    } finally {
      rmSync(rootDir, { recursive: true, force: true });
    }
  });

  test('does not treat SQL line-ending changes as query model drift', () => {
    const rootDir = mkdtempSync(path.join(tmpdir(), 'ashiba-check-contract-query-model-eol-'));

    try {
      const queryDir = path.join(rootDir, 'src/features/users/queries/list');
      const sqlPath = path.join(queryDir, 'list.sql');
      mkdirSync(queryDir, { recursive: true });
      writeFileSync(sqlPath, [
        'select user_id',
        'from public.users',
        'where email = :email',
        'order by user_id;',
        '',
      ].join('\n'), 'utf8');
      runModelGen({
        rootDir,
        sqlFile: 'src/features/users/queries/list/list.sql',
        out: 'src/features/users/queries/list/list.query.ts',
      });

      expect(runCheckContract({ rootDir, scopeDir: 'src/features/users/queries/list' }).ok).toBe(true);

      const lfSql = readFileSync(sqlPath, 'utf8').replace(/\r\n/g, '\n');
      writeFileSync(sqlPath, lfSql.replace(/\n/g, '\r\n'), 'utf8');
      const crlf = runCheckContract({ rootDir, scopeDir: 'src/features/users/queries/list' });

      expect(crlf.ok).toBe(true);
      expect(crlf.catalogCheck.checked[0]?.issues).toEqual([]);
    } finally {
      rmSync(rootDir, { recursive: true, force: true });
    }
  });

  test('rejects query model metadata mixed into editable contract files', () => {
    const rootDir = mkdtempSync(path.join(tmpdir(), 'ashiba-check-contract-inline-query-model-'));

    try {
      const queryDir = path.join(rootDir, 'src/features/users/queries/list');
      mkdirSync(queryDir, { recursive: true });
      writeFileSync(path.join(queryDir, 'list.sql'), 'select user_id from public.users where email = :email;', 'utf8');
      writeFileSync(path.join(queryDir, 'list.query.ts'), [
        'export const queryId = "users.list";',
        'export const sqlFile = "./list.sql";',
        'export const queryModel = { analysis: {}, bindings: {} } as const;',
        'export const querySpec = {',
        '  id: queryId,',
        '  sqlFile,',
        '  parameters: ["email"],',
        '  analysis: queryModel.analysis,',
        '} as const;',
        '',
      ].join('\n'), 'utf8');

      const result = runCheckContract({ rootDir, scopeDir: 'src/features/users/queries/list' });

      expect(result.ok).toBe(false);
      expect(result.catalogCheck.checked[0]?.issues).toContain(
        'queryModel metadata must be stored in generated/query.meta.ts, not mixed into the editable contract file.',
      );
    } finally {
      rmSync(rootDir, { recursive: true, force: true });
    }
  });

  test('checks stale optional condition compression query model metadata', () => {
    const rootDir = mkdtempSync(path.join(tmpdir(), 'ashiba-check-contract-optional-condition-compression-'));

    try {
      const queryDir = path.join(rootDir, 'src/features/users/queries/search');
      const sqlPath = path.join(queryDir, 'search.sql');
      mkdirSync(queryDir, { recursive: true });
      writeFileSync(sqlPath, [
        'select user_id from public.users',
        'where tenant_id = :tenant_id',
        '  and (:status is null or status = :status);',
        '',
      ].join('\n'), 'utf8');
      runModelGen({
        rootDir,
        sqlFile: 'src/features/users/queries/search/search.sql',
        out: 'src/features/users/queries/search/search.query.ts',
        optionalConditionCompression: true,
      });

      expect(runCheckContract({ rootDir, scopeDir: 'src/features/users/queries/search' }).ok).toBe(true);

      writeFileSync(sqlPath, [
        'select user_id from public.users',
        'where tenant_id = :tenant_id',
        '  and (:status is null or email = :status);',
        '',
      ].join('\n'), 'utf8');
      const fail = runCheckContract({ rootDir, scopeDir: 'src/features/users/queries/search' });

      expect(fail.ok).toBe(false);
      expect(fail.catalogCheck.checked[0]?.issues).toEqual(expect.arrayContaining([
        'queryModel.analysis.sourceHash is stale.',
        'queryModel.analysis.optionalConditionCompression is stale.',
        'queryModel.bindings.postgres.sourceHash is stale.',
        'queryModel.bindings.postgres.sql is stale.',
        'queryModel.bindings.postgres.optionalConditionCompression is stale.',
      ]));
      expect(fail.attainment.nextActions).toContain('Regenerate query model metadata from the current visible SQL.');
    } finally {
      rmSync(rootDir, { recursive: true, force: true });
    }
  });

  test('checks stale query model shape and result column metadata', () => {
    const rootDir = mkdtempSync(path.join(tmpdir(), 'ashiba-check-contract-query-model-shape-'));

    try {
      const queryDir = path.join(rootDir, 'src/features/users/queries/list');
      const sqlPath = path.join(queryDir, 'list.sql');
      mkdirSync(queryDir, { recursive: true });
      writeFileSync(sqlPath, 'select user_id from public.users where email = :email;', 'utf8');
      runModelGen({
        rootDir,
        sqlFile: 'src/features/users/queries/list/list.sql',
        out: 'src/features/users/queries/list/list.query.ts',
      });

      writeFileSync(sqlPath, [
        'select email from public.users where email = :email',
        'union all',
        'select email from public.archived_users where email = :email;',
      ].join('\n'), 'utf8');

      const fail = runCheckContract({ rootDir, scopeDir: 'src/features/users/queries/list' });

      expect(fail.ok).toBe(false);
      expect(fail.catalogCheck.checked[0]?.issues).toEqual(expect.arrayContaining([
        'queryModel.analysis.rootQueryShape is stale.',
        'queryModel.analysis.resultColumns is stale.',
        'queryModel.analysis.resultColumnTypes is stale.',
        'queryModel.analysis.safeSort is stale.',
      ]));
    } finally {
      rmSync(rootDir, { recursive: true, force: true });
    }
  });

  test('checks stale query model statement metadata', () => {
    const rootDir = mkdtempSync(path.join(tmpdir(), 'ashiba-check-contract-query-model-statement-'));

    try {
      const queryDir = path.join(rootDir, 'src/features/users/queries/create');
      const sqlPath = path.join(queryDir, 'create.sql');
      mkdirSync(queryDir, { recursive: true });
      writeFileSync(sqlPath, 'select user_id from public.users where email = :email;', 'utf8');
      runModelGen({
        rootDir,
        sqlFile: 'src/features/users/queries/create/create.sql',
        out: 'src/features/users/queries/create/create.query.ts',
      });

      writeFileSync(sqlPath, [
        'insert into public.users (email)',
        'values (:email)',
        'returning user_id;',
      ].join('\n'), 'utf8');

      const fail = runCheckContract({ rootDir, scopeDir: 'src/features/users/queries/create' });

      expect(fail.ok).toBe(false);
      expect(fail.catalogCheck.checked[0]?.issues).toEqual(expect.arrayContaining([
        'queryModel.analysis.statementKind is stale.',
        'queryModel.analysis.rootQueryShape is stale.',
        'queryModel.analysis.safeSort is stale.',
      ]));
    } finally {
      rmSync(rootDir, { recursive: true, force: true });
    }
  });

  test('runs top-level lint across SQL files', () => {
    const rootDir = mkdtempSync(path.join(tmpdir(), 'ashiba-top-lint-'));

    try {
      const sqlDir = path.join(rootDir, 'sql');
      mkdirSync(sqlDir, { recursive: true });
      writeFileSync(path.join(sqlDir, 'users.sql'), 'select id from public.users where id = :id;', 'utf8');

      const result = runLint('sql', { rootDir });

      expect(result.ok).toBe(true);
      expect(result.files).toHaveLength(1);
    } finally {
      rmSync(rootDir, { recursive: true, force: true });
    }
  });

  test('runs DDL-aware lint for missing tables and columns', () => {
    const rootDir = mkdtempSync(path.join(tmpdir(), 'ashiba-ddl-aware-lint-'));

    try {
      mkdirSync(path.join(rootDir, 'db', 'ddl'), { recursive: true });
      mkdirSync(path.join(rootDir, 'sql'), { recursive: true });
      writeFileSync(path.join(rootDir, 'db/ddl/public.sql'), [
        'create table public.users (',
        '  user_id integer primary key,',
        '  email text not null',
        ');',
        '',
      ].join('\n'), 'utf8');
      writeFileSync(path.join(rootDir, 'sql/users.sql'), [
        'select',
        '  u.user_id,',
        '  u.missing_email',
        'from public.users u',
        'join public.accounts a on a.user_id = u.user_id;',
        '',
      ].join('\n'), 'utf8');

      const result = runLint('sql', { rootDir });

      expect(result.ok).toBe(false);
      expect(result.files[0]?.analysisNotes).toEqual([]);
      expect(result.files[0]?.ddlIssues.map((issue) => issue.code)).toEqual(['ddl-missing-table', 'ddl-missing-column']);
      expect(result.files[0]?.output).toContain('public.accounts');
      expect(result.files[0]?.output).toContain('u.missing_email');
      expect(result.files[0]?.output).not.toContain('lexical SQL analysis');
    } finally {
      rmSync(rootDir, { recursive: true, force: true });
    }
  });

  test('ignores CTE-to-CTE references during DDL-aware lint', () => {
    const rootDir = mkdtempSync(path.join(tmpdir(), 'ashiba-ddl-aware-lint-cte-chain-'));

    try {
      mkdirSync(path.join(rootDir, 'db', 'ddl'), { recursive: true });
      mkdirSync(path.join(rootDir, 'sql'), { recursive: true });
      writeFileSync(path.join(rootDir, 'db/ddl/public.sql'), [
        'create table public.tickets (',
        '  ticket_id integer primary key,',
        '  customer_id integer not null,',
        '  subject text not null',
        ');',
        'create table public.customers (',
        '  customer_id integer primary key,',
        '  display_name text not null',
        ');',
        '',
      ].join('\n'), 'utf8');
      writeFileSync(path.join(rootDir, 'sql/list-tickets.sql'), [
        'with ticket_base as (',
        '  select',
        '    t.ticket_id,',
        '    t.subject,',
        '    c.display_name as customer_name',
        '  from public.tickets t',
        '  join public.customers c on c.customer_id = t.customer_id',
        '),',
        'ticket_view as (',
        '  select',
        '    ticket_id,',
        '    subject,',
        '    customer_name',
        '  from ticket_base',
        '),',
        'ticket_page as (',
        '  select',
        '    ticket_id,',
        '    subject,',
        '    customer_name',
        '  from ticket_view',
        ')',
        'select ticket_id, subject, customer_name',
        'from ticket_page',
        'order by ticket_id;',
        '',
      ].join('\n'), 'utf8');

      const result = runLint('sql', { rootDir });

      expect(result.ok).toBe(true);
      expect(result.files[0]?.ddlIssues).toEqual([]);
      expect(result.files[0]?.output).not.toContain('ticket_base');
      expect(result.files[0]?.output).not.toContain('ticket_view');
      expect(result.files[0]?.output).not.toContain('ticket_page');
    } finally {
      rmSync(rootDir, { recursive: true, force: true });
    }
  });

  test('ignores CTE aliases in UPDATE FROM DDL-aware lint', () => {
    const rootDir = mkdtempSync(path.join(tmpdir(), 'ashiba-ddl-aware-lint-cte-write-'));

    try {
      mkdirSync(path.join(rootDir, 'db', 'ddl'), { recursive: true });
      mkdirSync(path.join(rootDir, 'sql'), { recursive: true });
      writeFileSync(path.join(rootDir, 'db/ddl/public.sql'), [
        'create table public.users (',
        '  user_id integer primary key,',
        '  email text not null,',
        '  active boolean not null',
        ');',
        '',
      ].join('\n'), 'utf8');
      writeFileSync(path.join(rootDir, 'sql/update-users.sql'), [
        'with eligible_users as (',
        '  select user_id, email',
        '  from public.users',
        '  where active = true',
        ')',
        'update public.users u',
        'set email = e.email',
        'from eligible_users e',
        'where e.user_id = u.user_id;',
        '',
      ].join('\n'), 'utf8');

      const result = runLint('sql', { rootDir });

      expect(result.ok).toBe(true);
      expect(result.files.flatMap((file) => file.ddlIssues)).toEqual([]);
      expect(result.files.map((file) => file.output).join('\n')).not.toContain('eligible_users');
    } finally {
      rmSync(rootDir, { recursive: true, force: true });
    }
  });

  test('ignores CTE aliases in DELETE USING table references', () => {
    const refs = collectTableReferences(SqlParser.parse([
      'with stale_users as (',
      '  select user_id',
      '  from public.users',
      '  where active = false',
      ')',
      'delete from public.users u',
      'using stale_users s',
      'where s.user_id = u.user_id;',
      '',
    ].join('\n')));

    expect(refs.map((ref) => ref.table)).toEqual(['users', 'users']);
    expect(refs.map((ref) => ref.table)).not.toContain('stale_users');
  });

  test('runs DDL-aware lint for obvious INSERT literal type mismatch', () => {
    const rootDir = mkdtempSync(path.join(tmpdir(), 'ashiba-ddl-aware-lint-type-'));

    try {
      mkdirSync(path.join(rootDir, 'db', 'ddl'), { recursive: true });
      mkdirSync(path.join(rootDir, 'sql'), { recursive: true });
      writeFileSync(path.join(rootDir, 'db/ddl/public.sql'), [
        'create table public.users (',
        '  user_id integer primary key,',
        '  age integer not null',
        ');',
        '',
      ].join('\n'), 'utf8');
      writeFileSync(path.join(rootDir, 'sql/insert-user.sql'), [
        'insert into public.users (user_id, age)',
        'values',
        '  (1, 20),',
        '  (2, \'not-a-number\');',
        '',
      ].join('\n'), 'utf8');

      const result = runLint('sql', { rootDir });

      expect(result.ok).toBe(false);
      expect(result.files[0]?.ddlIssues).toEqual([
        expect.objectContaining({
          code: 'ddl-insert-type-mismatch',
          target: 'public.users.age',
        }),
      ]);
      expect(result.files[0]?.output).toContain('non-numeric literal');
    } finally {
      rmSync(rootDir, { recursive: true, force: true });
    }
  });

  test('runs DDL-aware lint for incompatible reuse of one SQL parameter across DDL column types', () => {
    const rootDir = mkdtempSync(path.join(tmpdir(), 'ashiba-ddl-aware-lint-param-type-'));

    try {
      mkdirSync(path.join(rootDir, 'db', 'ddl'), { recursive: true });
      mkdirSync(path.join(rootDir, 'sql'), { recursive: true });
      writeFileSync(path.join(rootDir, 'db/ddl/public.sql'), [
        'create table public.users (',
        '  user_id integer primary key,',
        '  age integer not null,',
        '  email text not null',
        ');',
        '',
      ].join('\n'), 'utf8');
      writeFileSync(path.join(rootDir, 'sql/create-user.sql'), [
        'insert into public.users (age, email)',
        'values (:value, :value);',
        '',
      ].join('\n'), 'utf8');

      const result = runLint('sql', { rootDir });

      expect(result.ok).toBe(false);
      expect(result.files[0]?.ddlIssues).toEqual([
        expect.objectContaining({
          code: 'ddl-parameter-type-conflict',
          target: 'value',
        }),
      ]);
      expect(result.files[0]?.output).toContain('incompatible DDL-backed types');
    } finally {
      rmSync(rootDir, { recursive: true, force: true });
    }
  });

  test('runs DDL-aware lint for missing UPDATE SET columns', () => {
    const rootDir = mkdtempSync(path.join(tmpdir(), 'ashiba-ddl-aware-lint-update-'));

    try {
      mkdirSync(path.join(rootDir, 'db', 'ddl'), { recursive: true });
      mkdirSync(path.join(rootDir, 'sql'), { recursive: true });
      writeFileSync(path.join(rootDir, 'db/ddl/public.sql'), [
        'create table public.users (',
        '  user_id integer primary key,',
        '  email text not null',
        ');',
        '',
      ].join('\n'), 'utf8');
      writeFileSync(path.join(rootDir, 'sql/update-user.sql'), [
        'update public.users',
        "set email = concat('x', ',', 'y'), missing_name = 'name'",
        'where user_id = 1;',
        '',
      ].join('\n'), 'utf8');

      const result = runLint('sql', { rootDir });

      expect(result.ok).toBe(false);
      expect(result.files[0]?.ddlIssues).toEqual([{
        code: 'ddl-missing-column',
        target: 'public.users.missing_name',
        message: 'UPDATE references a column that is not present in DDL: public.users.missing_name.',
      }]);
    } finally {
      rmSync(rootDir, { recursive: true, force: true });
    }
  });

  test('runs DDL-aware lint for unqualified single-table column references', () => {
    const rootDir = mkdtempSync(path.join(tmpdir(), 'ashiba-ddl-aware-lint-unqualified-'));

    try {
      mkdirSync(path.join(rootDir, 'db', 'ddl'), { recursive: true });
      mkdirSync(path.join(rootDir, 'sql'), { recursive: true });
      writeFileSync(path.join(rootDir, 'db/ddl/public.sql'), [
        'create table public.users (',
        '  user_id integer primary key,',
        '  email text not null',
        ');',
        '',
      ].join('\n'), 'utf8');
      writeFileSync(path.join(rootDir, 'sql/users.sql'), [
        'select',
        '  user_id,',
        '  missing_display_name',
        'from public.users',
        'where missing_status = :status;',
        '',
      ].join('\n'), 'utf8');

      const result = runLint('sql', { rootDir });

      expect(result.ok).toBe(false);
      expect(result.files[0]?.ddlIssues).toEqual([
        {
          code: 'ddl-missing-column',
          target: 'public.users.missing_display_name',
          message: 'SELECT references a column that is not present in DDL: public.users.missing_display_name.',
        },
        {
          code: 'ddl-missing-column',
          target: 'public.users.missing_status',
          message: 'WHERE references a column that is not present in DDL: public.users.missing_status.',
        },
      ]);
    } finally {
      rmSync(rootDir, { recursive: true, force: true });
    }
  });

  test('runs DDL-aware lint for unqualified right-hand predicate column references', () => {
    const rootDir = mkdtempSync(path.join(tmpdir(), 'ashiba-ddl-aware-lint-predicate-right-'));

    try {
      mkdirSync(path.join(rootDir, 'db', 'ddl'), { recursive: true });
      mkdirSync(path.join(rootDir, 'sql'), { recursive: true });
      writeFileSync(path.join(rootDir, 'db/ddl/public.sql'), [
        'create table public.users (',
        '  user_id integer primary key,',
        '  email text not null,',
        '  status text not null',
        ');',
        '',
      ].join('\n'), 'utf8');
      writeFileSync(path.join(rootDir, 'sql/users.sql'), [
        'select user_id',
        'from public.users',
        'where status = missing_status',
        'having email = missing_email;',
        '',
      ].join('\n'), 'utf8');

      const result = runLint('sql', { rootDir });

      expect(result.ok).toBe(false);
      expect(result.files[0]?.ddlIssues).toEqual([
        {
          code: 'ddl-missing-column',
          target: 'public.users.missing_status',
          message: 'WHERE references a column that is not present in DDL: public.users.missing_status.',
        },
        {
          code: 'ddl-missing-column',
          target: 'public.users.missing_email',
          message: 'HAVING references a column that is not present in DDL: public.users.missing_email.',
        },
      ]);
    } finally {
      rmSync(rootDir, { recursive: true, force: true });
    }
  });

  test('runs DDL-aware lint through postgres escape strings with comment markers', () => {
    const rootDir = mkdtempSync(path.join(tmpdir(), 'ashiba-ddl-aware-lint-escape-string-'));

    try {
      mkdirSync(path.join(rootDir, 'db', 'ddl'), { recursive: true });
      mkdirSync(path.join(rootDir, 'sql'), { recursive: true });
      writeFileSync(path.join(rootDir, 'db/ddl/public.sql'), [
        'create table public.users (',
        '  user_id integer primary key,',
        '  email text not null,',
        '  status text not null',
        ');',
        '',
      ].join('\n'), 'utf8');
      writeFileSync(path.join(rootDir, 'sql/users.sql'), [
        'select',
        String.raw`  E'it\'s -- not a comment, /* not a block */' as note,`,
        '  user_id',
        'from public.users',
        'where status = :status;',
        '',
      ].join('\n'), 'utf8');

      const result = runLint('sql', { rootDir });

      expect(result.ok).toBe(true);
      expect(result.files[0]?.ddlIssues).toEqual([]);
    } finally {
      rmSync(rootDir, { recursive: true, force: true });
    }
  });

  test('runs DDL-aware lint for unqualified single-table grouping and ordering references', () => {
    const rootDir = mkdtempSync(path.join(tmpdir(), 'ashiba-ddl-aware-lint-group-order-'));

    try {
      mkdirSync(path.join(rootDir, 'db', 'ddl'), { recursive: true });
      mkdirSync(path.join(rootDir, 'sql'), { recursive: true });
      writeFileSync(path.join(rootDir, 'db/ddl/public.sql'), [
        'create table public.users (',
        '  user_id integer primary key,',
        '  email text not null',
        ');',
        '',
      ].join('\n'), 'utf8');
      writeFileSync(path.join(rootDir, 'sql/users.sql'), [
        'select email, count(*) as user_count',
        'from public.users',
        'group by missing_group',
        'having missing_having > 0',
        'order by missing_order desc;',
        '',
      ].join('\n'), 'utf8');

      const result = runLint('sql', { rootDir });

      expect(result.ok).toBe(false);
      expect(result.files[0]?.ddlIssues).toEqual([
        {
          code: 'ddl-missing-column',
          target: 'public.users.missing_group',
          message: 'GROUP BY references a column that is not present in DDL: public.users.missing_group.',
        },
        {
          code: 'ddl-missing-column',
          target: 'public.users.missing_having',
          message: 'HAVING references a column that is not present in DDL: public.users.missing_having.',
        },
        {
          code: 'ddl-missing-column',
          target: 'public.users.missing_order',
          message: 'ORDER BY references a column that is not present in DDL: public.users.missing_order.',
        },
      ]);
    } finally {
      rmSync(rootDir, { recursive: true, force: true });
    }
  });

  test('runs DDL-aware lint for missing mutation RETURNING columns', () => {
    const rootDir = mkdtempSync(path.join(tmpdir(), 'ashiba-ddl-aware-lint-returning-'));

    try {
      mkdirSync(path.join(rootDir, 'db', 'ddl'), { recursive: true });
      mkdirSync(path.join(rootDir, 'sql'), { recursive: true });
      writeFileSync(path.join(rootDir, 'db/ddl/public.sql'), [
        'create table public.users (',
        '  user_id integer primary key,',
        '  email text not null',
        ');',
        '',
      ].join('\n'), 'utf8');
      writeFileSync(path.join(rootDir, 'sql/create-user.sql'), [
        'insert into public.users (email)',
        'values (:email)',
        'returning user_id as id, missing_name;',
        '',
      ].join('\n'), 'utf8');

      const result = runLint('sql', { rootDir });

      expect(result.ok).toBe(false);
      expect(result.files[0]?.ddlIssues).toEqual([{
        code: 'ddl-missing-column',
        target: 'public.users.missing_name',
        message: 'RETURNING references a column that is not present in DDL: public.users.missing_name.',
      }]);
    } finally {
      rmSync(rootDir, { recursive: true, force: true });
    }
  });

  test('generates editable query contract scaffolds from named-parameter SQL', () => {
    const rootDir = mkdtempSync(path.join(tmpdir(), 'ashiba-model-gen-'));

    try {
      const sqlDir = path.join(rootDir, 'src/features/users/queries/list');
      const sqlPath = path.join(sqlDir, 'list.sql');
      const outPath = path.join(sqlDir, 'list.query.ts');
      mkdirSync(sqlDir, { recursive: true });
      writeFileSync(sqlPath, [
        '-- :commented_param must not be detected',
        'select user_id, email from public.users where email = :email and status = @status;',
        '',
      ].join('\n'), 'utf8');

      const result = runModelGen({ rootDir, sqlFile: 'src/features/users/queries/list/list.sql', out: 'src/features/users/queries/list/list.query.ts' });
      const metaPath = path.join(sqlDir, 'generated', 'list.meta.ts');

      expect(result.id).toBe('users.list.list');
      expect(result.parameters).toEqual(['email', 'status']);
      expect(result.resultColumns).toEqual(['email', 'user_id']);
      expect(result.analysis).toMatchObject({
        astParse: 'ok',
        statementKind: 'select',
        hasTopLevelOrderBy: false,
        sourceHash: expect.stringMatching(/^sha256:/),
        safeSort: {
          insertion: {
            status: 'ready',
            mode: 'order-by',
          },
          sortable: {
            email: { sql: 'email' },
            user_id: { sql: 'user_id' },
          },
        },
        namedParameters: ['email', 'status'],
        resultColumns: ['email', 'user_id'],
      });
      expect(result.bindings.postgres).toMatchObject({
        sourceHash: result.analysis.sourceHash,
        orderedNames: ['email', 'status'],
      });
      expect(result.bindings.mysql2).toMatchObject({
        sourceHash: result.analysis.sourceHash,
        orderedNames: ['email', 'status'],
      });
      expect(result.bindings.mssql).toMatchObject({
        sourceHash: result.analysis.sourceHash,
        orderedNames: ['email', 'status'],
      });
      expect(result.bindings.postgres.sql).toContain('email = $1 and status = $2');
      expect(result.bindings.mysql2?.sql).toContain('email = ? and status = ?');
      expect(result.bindings.mssql?.sql).toContain('email = @email and status = @status');
      expect(result.metadataOut).toBe('src/features/users/queries/list/generated/list.meta.ts');
      expect(readFileSync(outPath, 'utf8')).toContain('export const querySpec');
      expect(readFileSync(outPath, 'utf8')).toContain('import { queryModel } from "./generated/list.meta.js";');
      expect(readFileSync(outPath, 'utf8')).not.toContain('export const queryModel');
      expect(readFileSync(outPath, 'utf8')).toContain('email: unknown');
      expect(readFileSync(outPath, 'utf8')).toContain('user_id: unknown');
      expect(readFileSync(metaPath, 'utf8')).toContain('Generated by Ashiba model-gen. Do not edit by hand.');
      expect(readFileSync(metaPath, 'utf8')).toContain('"bindings"');
      expect(readFileSync(metaPath, 'utf8')).toContain('"mysql2"');
      expect(readFileSync(metaPath, 'utf8')).toContain('"mssql"');
    } finally {
      rmSync(rootDir, { recursive: true, force: true });
    }
  });

  test('generates DDL-backed query parameter types when model-gen can resolve parameter ownership', () => {
    const rootDir = mkdtempSync(path.join(tmpdir(), 'ashiba-model-gen-param-types-'));

    try {
      const sqlDir = path.join(rootDir, 'src/features/users/queries/list');
      const sqlPath = path.join(sqlDir, 'list.sql');
      const ddlPath = path.join(rootDir, 'db', 'ddl', 'public.sql');
      mkdirSync(sqlDir, { recursive: true });
      mkdirSync(path.dirname(ddlPath), { recursive: true });
      writeFileSync(ddlPath, [
        'create table public.users (',
        '  user_id integer primary key,',
        '  active boolean not null,',
        '  balance numeric not null,',
        '  email text not null',
        ');',
        '',
      ].join('\n'), 'utf8');
      writeFileSync(sqlPath, [
        'select user_id, email',
        'from public.users',
        'where user_id = :id and active = :active and balance >= :minimum_balance;',
        '',
      ].join('\n'), 'utf8');

      const result = runModelGen({
        rootDir,
        sqlFile: 'src/features/users/queries/list/list.sql',
        out: 'src/features/users/queries/list/list.query.ts',
      });

      expect(result.analysis.parameterTypes).toEqual({
        active: 'boolean',
        id: 'number',
        minimum_balance: 'string',
      });
      expect(result.contents).toContain('id: number;');
      expect(result.contents).toContain('active: boolean;');
      expect(result.contents).toContain('minimum_balance: string;');
    } finally {
      rmSync(rootDir, { recursive: true, force: true });
    }
  });

  test('uses configured schema search path for unqualified model-gen SQL', () => {
    const rootDir = mkdtempSync(path.join(tmpdir(), 'ashiba-model-gen-schema-path-'));

    try {
      const sqlDir = path.join(rootDir, 'src/features/users/queries/read');
      const sqlPath = path.join(sqlDir, 'read.sql');
      const ddlPath = path.join(rootDir, 'db', 'ddl', 'schema.sql');
      mkdirSync(sqlDir, { recursive: true });
      mkdirSync(path.dirname(ddlPath), { recursive: true });
      writeFileSync(path.join(rootDir, 'ashiba.config.json'), JSON.stringify({
        defaultSchema: 'app',
        searchPath: ['app', 'public'],
      }, null, 2), 'utf8');
      writeFileSync(ddlPath, [
        'create table public.users (',
        '  user_id integer primary key,',
        '  email text not null',
        ');',
        'create table app.users (',
        '  account_id bigint primary key,',
        '  email text not null',
        ');',
        '',
      ].join('\n'), 'utf8');
      writeFileSync(sqlPath, [
        'select account_id, email',
        'from users',
        'where account_id = :account_id;',
        '',
      ].join('\n'), 'utf8');

      const result = runModelGen({
        rootDir,
        sqlFile: 'src/features/users/queries/read/read.sql',
        out: 'src/features/users/queries/read/read.query.ts',
      });

      expect(result.analysis.parameterTypes).toEqual({
        account_id: 'string',
      });
      expect(result.analysis.resultColumnTypes).toEqual({
        account_id: 'string',
        email: 'string',
      });
      expect(result.contents).toContain('account_id: string;');
      expect(result.contents).toContain('account_id: string;');
    } finally {
      rmSync(rootDir, { recursive: true, force: true });
    }
  });

  test('generates optional condition compression metadata by default', () => {
    const rootDir = mkdtempSync(path.join(tmpdir(), 'ashiba-model-gen-optional-condition-compression-'));

    try {
      const sqlDir = path.join(rootDir, 'src/features/users/queries/search');
      const sqlPath = path.join(sqlDir, 'search.sql');
      mkdirSync(sqlDir, { recursive: true });
      writeFileSync(sqlPath, [
        'select user_id as id, email',
        'from public.users',
        'where tenant_id = :tenant_id',
        '  and (:status is null or status = :status);',
        '',
      ].join('\n'), 'utf8');

      const result = runModelGen({
        rootDir,
        sqlFile: 'src/features/users/queries/search/search.sql',
      });

      expect(result.analysis.optionalConditionCompression).toMatchObject({
        enabled: true,
        branches: [{
          parameterName: 'status',
          kind: 'expression',
        }],
      });
      expect(result.analysis.optionalConditionCompression?.branches[0]?.removalRange.text)
        .toContain('and (:status is null or status = :status)');
      expect(result.analysis.optionalConditionCompression?.branches[0]?.presentReplacement).toMatchObject({
        text: 'status = :status',
      });
      expect(result.bindings.postgres.optionalConditionCompression).toMatchObject({
        branches: [{
          parameterName: 'status',
          presentReplacement: {
            text: 'status = $2',
          },
        }],
      });
      expect(result.metadataContents).toContain('optionalConditionCompression');
    } finally {
      rmSync(rootDir, { recursive: true, force: true });
    }
  });

  test('generates optional condition compression metadata for casted null guards', () => {
    const rootDir = mkdtempSync(path.join(tmpdir(), 'ashiba-model-gen-casted-optional-condition-'));

    try {
      const sqlDir = path.join(rootDir, 'src/features/users/queries/search');
      const sqlPath = path.join(sqlDir, 'search.sql');
      mkdirSync(sqlDir, { recursive: true });
      writeFileSync(sqlPath, [
        'select user_id as id, email',
        'from public.users',
        'where tenant_id = :tenant_id',
        '  and (cast(:status as text) is null or status = :status)',
        '  and (:language::text is null or language = :language)',
        '  and (cast(:tag as text) is null or :tag = any(coalesce(tags, array[]::text[])));',
        '',
      ].join('\n'), 'utf8');

      const result = runModelGen({
        rootDir,
        sqlFile: 'src/features/users/queries/search/search.sql',
      });

      expect(result.analysis.optionalConditionCompression?.branches).toHaveLength(3);
      expect(result.analysis.optionalConditionCompression?.branches[0]).toMatchObject({
        parameterName: 'status',
        presentReplacement: {
          text: 'status = :status',
        },
      });
      expect(result.analysis.optionalConditionCompression?.branches[1]).toMatchObject({
        parameterName: 'language',
        presentReplacement: {
          text: 'language = :language',
        },
      });
      expect(result.analysis.optionalConditionCompression?.branches[2]).toMatchObject({
        parameterName: 'tag',
        presentReplacement: {
          text: ':tag = any(coalesce(tags, array[]::text[]))',
        },
      });
      expect(result.bindings.postgres.optionalConditionCompression?.branches[0]).toMatchObject({
        parameterName: 'status',
        presentReplacement: {
          text: 'status = $2',
        },
      });
      expect(result.bindings.postgres.optionalConditionCompression?.branches[1]).toMatchObject({
        parameterName: 'language',
        presentReplacement: {
          text: 'language = $4',
        },
      });
      expect(result.bindings.postgres.optionalConditionCompression?.branches[2]).toMatchObject({
        parameterName: 'tag',
        presentReplacement: {
          text: '$6 = any(coalesce(tags, array[]::text[]))',
        },
      });
    } finally {
      rmSync(rootDir, { recursive: true, force: true });
    }
  });

  test('does not generate fallback optional condition metadata from comments or dollar-quoted strings', () => {
    const rootDir = mkdtempSync(path.join(tmpdir(), 'ashiba-model-gen-casted-optional-condition-comments-'));

    try {
      const sqlDir = path.join(rootDir, 'src/features/users/queries/search');
      const sqlPath = path.join(sqlDir, 'search.sql');
      mkdirSync(sqlDir, { recursive: true });
      writeFileSync(sqlPath, [
        '-- Example only: (cast(:comment_status as text) is null or status = :comment_status)',
        'select',
        '  user_id as id,',
        '  $tag$(cast(:body_status as text) is null or status = :body_status)$tag$ as note',
        'from public.users',
        'where tenant_id = :tenant_id',
        '  and (cast(:status as text) is null or status = :status)',
        '  and (cast(:priority as text) is null or /* :fake_priority or */ priority = :priority)',
        '  and (:kind is null or kind = :kind || $tag$or :fake_kind$tag$);',
        '',
      ].join('\n'), 'utf8');

      const result = runModelGen({
        rootDir,
        sqlFile: 'src/features/users/queries/search/search.sql',
      });

      expect(result.analysis.optionalConditionCompression?.branches.map((branch) => branch.parameterName))
        .toEqual(['status', 'priority', 'kind']);
      expect(result.bindings.postgres.optionalConditionCompression?.branches.map((branch) => branch.parameterName))
        .toEqual(['status', 'priority', 'kind']);
    } finally {
      rmSync(rootDir, { recursive: true, force: true });
    }
  });

  test('generates optional condition compression metadata for nested query scopes', () => {
    const rootDir = mkdtempSync(path.join(tmpdir(), 'ashiba-model-gen-optional-condition-nested-'));

    try {
      const sqlDir = path.join(rootDir, 'src/features/users/queries/search');
      const sqlPath = path.join(sqlDir, 'search.sql');
      mkdirSync(sqlDir, { recursive: true });
      writeFileSync(sqlPath, [
        'with scoped as (',
        '  select user_id, email',
        '  from public.users',
        '  where (:inner_status is null or status = :inner_status)',
        ')',
        'select *',
        'from (',
        '  select *',
        '  from scoped',
        '  where (:derived_email is null or email = :derived_email)',
        ') derived',
        'where (:root_id is null or user_id = :root_id);',
        '',
      ].join('\n'), 'utf8');

      const result = runModelGen({
        rootDir,
        sqlFile: 'src/features/users/queries/search/search.sql',
      });

      expect(result.analysis.optionalConditionCompression?.branches.map((branch) => branch.parameterName)).toEqual([
        'inner_status',
        'derived_email',
        'root_id',
      ]);
      expect(result.bindings.postgres.optionalConditionCompression?.branches.map((branch) => branch.parameterName)).toEqual([
        'inner_status',
        'derived_email',
        'root_id',
      ]);
      expect(result.analysis.optionalConditionCompression?.branches.map((branch) => branch.removalRange.text)).toEqual([
        'where (:inner_status is null or status = :inner_status)',
        'where (:derived_email is null or email = :derived_email)',
        'where (:root_id is null or user_id = :root_id)',
      ]);
    } finally {
      rmSync(rootDir, { recursive: true, force: true });
    }
  });

  test('generates grouped optional condition removal metadata without runtime SQL cleanup', () => {
    const rootDir = mkdtempSync(path.join(tmpdir(), 'ashiba-model-gen-optional-condition-groups-'));

    try {
      const sqlDir = path.join(rootDir, 'src/features/users/queries/search');
      const sqlPath = path.join(sqlDir, 'search.sql');
      mkdirSync(sqlDir, { recursive: true });
      writeFileSync(sqlPath, [
        'select user_id as id, email',
        'from public.users',
        'where (:email is null or email = :email)',
        '  and (:status is null or status = :status)',
        '  and tenant_id = :tenant_id;',
        '',
      ].join('\n'), 'utf8');

      const result = runModelGen({
        rootDir,
        sqlFile: 'src/features/users/queries/search/search.sql',
      });

      expect(result.analysis.optionalConditionCompression?.groups).toEqual([{
        branchIndexes: [0, 1],
        removalRange: {
          start: readFileSync(sqlPath, 'utf8').indexOf('(:email is null'),
          end: readFileSync(sqlPath, 'utf8').indexOf('tenant_id = :tenant_id'),
          text: [
            '(:email is null or email = :email)',
            '  and (:status is null or status = :status)',
            '  and ',
          ].join('\n'),
        },
        leadingPrefixes: [{
          branchIndexes: [0],
          removalRange: {
            start: readFileSync(sqlPath, 'utf8').indexOf('(:email is null'),
            end: readFileSync(sqlPath, 'utf8').indexOf('(:status is null'),
            text: [
              '(:email is null or email = :email)',
              '  and ',
            ].join('\n'),
          },
        }],
      }]);
      expect(result.bindings.postgres.optionalConditionCompression?.groups).toEqual([{
        branchIndexes: [0, 1],
        removalRange: {
          start: result.bindings.postgres.sql.indexOf('($1 is null'),
          end: result.bindings.postgres.sql.indexOf('tenant_id = $5'),
          text: [
            '($1 is null or email = $2)',
            '  and ($3 is null or status = $4)',
            '  and ',
          ].join('\n'),
        },
        leadingPrefixes: [{
          branchIndexes: [0],
          removalRange: {
            start: result.bindings.postgres.sql.indexOf('($1 is null'),
            end: result.bindings.postgres.sql.indexOf('($3 is null'),
            text: [
              '($1 is null or email = $2)',
              '  and ',
            ].join('\n'),
          },
        }],
      }]);
    } finally {
      rmSync(rootDir, { recursive: true, force: true });
    }
  });

  test('generates leading optional condition prefix metadata across SQL comments', () => {
    const rootDir = mkdtempSync(path.join(tmpdir(), 'ashiba-model-gen-optional-condition-comment-prefix-'));

    try {
      const sqlDir = path.join(rootDir, 'src/features/users/queries/search');
      const sqlPath = path.join(sqlDir, 'search.sql');
      mkdirSync(sqlDir, { recursive: true });
      writeFileSync(sqlPath, [
        'select user_id as id, email',
        'from public.users',
        'where (:email is null or email = :email)',
        '  /* keep connector trivia */',
        '  and (:status is null or status = :status)',
        '  and tenant_id = :tenant_id;',
        '',
      ].join('\n'), 'utf8');

      const result = runModelGen({
        rootDir,
        sqlFile: 'src/features/users/queries/search/search.sql',
      });

      expect(result.analysis.optionalConditionCompression?.groups?.[0]?.leadingPrefixes).toEqual([{
        branchIndexes: [0],
        removalRange: {
          start: readFileSync(sqlPath, 'utf8').indexOf('(:email is null'),
          end: readFileSync(sqlPath, 'utf8').indexOf('(:status is null'),
          text: [
            '(:email is null or email = :email)',
            '  /* keep connector trivia */',
            '  and ',
          ].join('\n'),
        },
      }]);
      expect(result.bindings.postgres.optionalConditionCompression?.groups?.[0]?.leadingPrefixes).toEqual([{
        branchIndexes: [0],
        removalRange: {
          start: result.bindings.postgres.sql.indexOf('($1 is null'),
          end: result.bindings.postgres.sql.indexOf('($3 is null'),
          text: [
            '($1 is null or email = $2)',
            '  /* keep connector trivia */',
            '  and ',
          ].join('\n'),
        },
      }]);
    } finally {
      rmSync(rootDir, { recursive: true, force: true });
    }
  });

  test('numbers grouped optional condition binding text with prior SQL parameters', () => {
    const rootDir = mkdtempSync(path.join(tmpdir(), 'ashiba-model-gen-optional-condition-groups-prior-params-'));

    try {
      const sqlDir = path.join(rootDir, 'src/features/users/queries/search');
      const sqlPath = path.join(sqlDir, 'search.sql');
      mkdirSync(sqlDir, { recursive: true });
      writeFileSync(sqlPath, [
        'with scoped_users as (',
        '  select user_id',
        '  from public.users',
        '  where (:scope is null or scope = :scope)',
        ')',
        'select user_id as id, email',
        'from public.users',
        'where (:email is null or email = :email)',
        '  and (:status is null or status = :status)',
        '  and tenant_id = :tenant_id;',
        '',
      ].join('\n'), 'utf8');

      const result = runModelGen({
        rootDir,
        sqlFile: 'src/features/users/queries/search/search.sql',
      });

      expect(result.bindings.postgres.optionalConditionCompression?.groups).toEqual([{
        branchIndexes: [1, 2],
        removalRange: {
          start: result.bindings.postgres.sql.indexOf('($3 is null'),
          end: result.bindings.postgres.sql.indexOf('tenant_id = $7'),
          text: [
            '($3 is null or email = $4)',
            '  and ($5 is null or status = $6)',
            '  and ',
          ].join('\n'),
        },
        leadingPrefixes: [{
          branchIndexes: [1],
          removalRange: {
            start: result.bindings.postgres.sql.indexOf('($3 is null'),
            end: result.bindings.postgres.sql.indexOf('($5 is null'),
            text: [
              '($3 is null or email = $4)',
              '  and ',
            ].join('\n'),
          },
        }],
      }]);
      expect(result.bindings.postgres.optionalConditionCompression?.groups[0]?.removalRange.text)
        .toBe(result.bindings.postgres.sql.slice(
          result.bindings.postgres.sql.indexOf('($3 is null'),
          result.bindings.postgres.sql.indexOf('tenant_id = $7'),
        ));
      expect(readFileSync(sqlPath, 'utf8')).toContain(':scope');
    } finally {
      rmSync(rootDir, { recursive: true, force: true });
    }
  });

  test('uses collision-free metadata names when model-gen writes sibling query contracts', () => {
    const rootDir = mkdtempSync(path.join(tmpdir(), 'ashiba-model-gen-sibling-contracts-'));

    try {
      const queryDir = path.join(rootDir, 'tmp/query-contracts');
      mkdirSync(queryDir, { recursive: true });
      writeFileSync(path.join(queryDir, 'first.sql'), 'select user_id from public.users where email = :email\n', 'utf8');
      writeFileSync(path.join(queryDir, 'second.sql'), 'select email from public.users where user_id = :user_id\n', 'utf8');

      const first = runModelGen({
        rootDir,
        sqlFile: 'tmp/query-contracts/first.sql',
        out: 'tmp/query-contracts/first.query.ts',
      });
      const second = runModelGen({
        rootDir,
        sqlFile: 'tmp/query-contracts/second.sql',
        out: 'tmp/query-contracts/second.query.ts',
      });

      expect(first.metadataOut).toBe('tmp/query-contracts/generated/first.meta.ts');
      expect(second.metadataOut).toBe('tmp/query-contracts/generated/second.meta.ts');
      expect(readFileSync(path.join(queryDir, 'first.query.ts'), 'utf8')).toContain('./generated/first.meta.js');
      expect(readFileSync(path.join(queryDir, 'second.query.ts'), 'utf8')).toContain('./generated/second.meta.js');
      expect(readFileSync(path.join(queryDir, 'generated', 'first.meta.ts'), 'utf8')).toContain('"queryId": "tmp.query-contracts.first"');
      expect(readFileSync(path.join(queryDir, 'generated', 'second.meta.ts'), 'utf8')).toContain('"queryId": "tmp.query-contracts.second"');
    } finally {
      rmSync(rootDir, { recursive: true, force: true });
    }
  });

  test('infers query contract result columns from CTE aliases and functions', () => {
    const rootDir = mkdtempSync(path.join(tmpdir(), 'ashiba-model-gen-rich-columns-'));

    try {
      const sqlDir = path.join(rootDir, 'src/features/users/queries/search');
      const sqlPath = path.join(sqlDir, 'search.sql');
      mkdirSync(sqlDir, { recursive: true });
      writeFileSync(sqlPath, [
        'with base as (',
        '  select user_id, email from public.users',
        ')',
        'select',
        '  base.user_id as id,',
        '  lower(base.email) as normalized_email,',
        '  count(*) as match_count',
        'from base',
        'where base.email = :email',
        'group by base.user_id, base.email;',
        '',
      ].join('\n'), 'utf8');

      const result = runModelGen({ rootDir, sqlFile: 'src/features/users/queries/search/search.sql' });

      expect(result.parameters).toEqual(['email']);
      expect(result.resultColumns).toEqual(['id', 'match_count', 'normalized_email']);
      expect(result.analysis.resultColumnTypes).toEqual({
        id: 'unknown',
        match_count: 'number',
        normalized_email: 'string',
      });
      expect(result.contents).toContain('match_count: number');
      expect(result.contents).toContain('normalized_email: string');
    } finally {
      rmSync(rootDir, { recursive: true, force: true });
    }
  });

  test('does not silently fallback when model-gen SQL cannot be parsed by AST', () => {
    const rootDir = mkdtempSync(path.join(tmpdir(), 'ashiba-model-gen-ast-fail-'));

    try {
      const sqlDir = path.join(rootDir, 'src/features/users/queries/broken');
      const sqlPath = path.join(sqlDir, 'broken.sql');
      mkdirSync(sqlDir, { recursive: true });
      writeFileSync(sqlPath, [
        'select * from ;',
        '',
      ].join('\n'), 'utf8');

      expect(() => runModelGen({ rootDir, sqlFile: 'src/features/users/queries/broken/broken.sql' }))
        .toThrow(/SQL AST parse failed while extracting result columns/);
    } finally {
      rmSync(rootDir, { recursive: true, force: true });
    }
  });

  test('infers query contract result columns from SELECT without FROM', () => {
    const rootDir = mkdtempSync(path.join(tmpdir(), 'ashiba-model-gen-select-no-from-'));

    try {
      const sqlDir = path.join(rootDir, 'src/features/health/queries/check');
      const sqlPath = path.join(sqlDir, 'check.sql');
      mkdirSync(sqlDir, { recursive: true });
      writeFileSync(sqlPath, [
        'select',
        '  1 as ok,',
        "  'ready' as label,",
        '  true as enabled,',
        '  now() as checked_at;',
        '',
      ].join('\n'), 'utf8');

      const result = runModelGen({ rootDir, sqlFile: 'src/features/health/queries/check/check.sql' });

      expect(result.resultColumns).toEqual(['checked_at', 'enabled', 'label', 'ok']);
      expect(result.contents).toContain('checked_at: string');
      expect(result.contents).toContain('enabled: boolean');
      expect(result.contents).toContain('label: string');
      expect(result.contents).toContain('ok: number');
    } finally {
      rmSync(rootDir, { recursive: true, force: true });
    }
  });

  test('infers query contract result columns through postgres escape strings', () => {
    const rootDir = mkdtempSync(path.join(tmpdir(), 'ashiba-model-gen-result-escape-string-'));

    try {
      const sqlDir = path.join(rootDir, 'src/features/users/queries/escape-result');
      const sqlPath = path.join(sqlDir, 'escape-result.sql');
      mkdirSync(sqlDir, { recursive: true });
      writeFileSync(sqlPath, [
        'select',
        String.raw`  E'it\'s, not a column, from inside string' as note,`,
        '  1 as ok',
        'from public.users',
        'where user_id = :id;',
        '',
      ].join('\n'), 'utf8');

      const result = runModelGen({ rootDir, sqlFile: 'src/features/users/queries/escape-result/escape-result.sql' });

      expect(result.parameters).toEqual(['id']);
      expect(result.resultColumns).toEqual(['note', 'ok']);
      expect(result.analysis.resultColumnTypes).toEqual({
        note: 'unknown',
        ok: 'number',
      });
    } finally {
      rmSync(rootDir, { recursive: true, force: true });
    }
  });

  test('infers query contract result column types from SQL casts', () => {
    const rootDir = mkdtempSync(path.join(tmpdir(), 'ashiba-model-gen-cast-types-'));

    try {
      const sqlDir = path.join(rootDir, 'src/features/users/queries/cast');
      const sqlPath = path.join(sqlDir, 'cast.sql');
      mkdirSync(sqlDir, { recursive: true });
      writeFileSync(sqlPath, [
        'select',
        '  cast(:user_id as integer) as id,',
        "  'ready'::text as label,",
        '  cast(true as boolean) as enabled;',
        '',
      ].join('\n'), 'utf8');

      const result = runModelGen({ rootDir, sqlFile: 'src/features/users/queries/cast/cast.sql' });

      expect(result.resultColumns).toEqual(['enabled', 'id', 'label']);
      expect(result.analysis.resultColumnTypes).toEqual({
        enabled: 'boolean',
        id: 'number',
        label: 'string',
      });
      expect(result.contents).toContain('id: number');
      expect(result.contents).toContain('label: string');
      expect(result.contents).toContain('enabled: boolean');
    } finally {
      rmSync(rootDir, { recursive: true, force: true });
    }
  });

  test('infers query contract result column types from timestamp and array casts', () => {
    const rootDir = mkdtempSync(path.join(tmpdir(), 'ashiba-model-gen-timestamp-array-types-'));

    try {
      const sqlDir = path.join(rootDir, 'src/features/users/queries/cast-array');
      const sqlPath = path.join(sqlDir, 'cast-array.sql');
      mkdirSync(sqlDir, { recursive: true });
      writeFileSync(sqlPath, [
        'select',
        "  cast('2026-01-01T00:00:00.000Z' as timestamptz) as created_at,",
        '  cast(array[] as text[]) as tag_slugs,',
        '  cast(array[] as bigint[]) as big_ids,',
        '  cast(array[] as float8[]) as scores,',
        '  cast(1 as bigint) as big_id,',
        '  cast(2.5 as numeric(10, 2)) as amount,',
        '  cast(3.5 as double precision) as ratio;',
        '',
      ].join('\n'), 'utf8');

      const result = runModelGen({ rootDir, sqlFile: 'src/features/users/queries/cast-array/cast-array.sql' });

      expect(result.analysis.resultColumnTypes).toEqual({
        amount: 'string',
        big_ids: 'string[]',
        big_id: 'string',
        created_at: 'string',
        ratio: 'number',
        scores: 'number[]',
        tag_slugs: 'string[]',
      });
      expect(result.contents).toContain('amount: string');
      expect(result.contents).toContain('big_ids: string[]');
      expect(result.contents).toContain('big_id: string');
      expect(result.contents).toContain('created_at: string');
      expect(result.contents).toContain('ratio: number');
      expect(result.contents).toContain('scores: number[]');
      expect(result.contents).toContain('tag_slugs: string[]');
    } finally {
      rmSync(rootDir, { recursive: true, force: true });
    }
  });

  test('uses DDL schema model for simple row type hints', () => {
    const rootDir = mkdtempSync(path.join(tmpdir(), 'ashiba-model-gen-ddl-types-'));

    try {
      mkdirSync(path.join(rootDir, 'db', 'ddl'), { recursive: true });
      writeFileSync(path.join(rootDir, 'db/ddl/public.sql'), [
        'create table public.users (',
        '  user_id integer primary key,',
        '  email text not null,',
        '  active boolean not null',
        ');',
        '',
      ].join('\n'), 'utf8');
      const sqlDir = path.join(rootDir, 'src/features/users/queries/list');
      const sqlPath = path.join(sqlDir, 'list.sql');
      mkdirSync(sqlDir, { recursive: true });
      writeFileSync(sqlPath, [
        'select',
        '  u.user_id as id,',
        '  u.email,',
        '  u.active',
        'from public.users u',
        'where u.user_id = :user_id;',
        '',
      ].join('\n'), 'utf8');

      const result = runModelGen({ rootDir, sqlFile: 'src/features/users/queries/list/list.sql' });

      expect(result.resultColumns).toEqual(['active', 'email', 'id']);
      expect(result.analysis.resultColumnTypes).toEqual({
        active: 'boolean',
        email: 'string',
        id: 'number',
      });
      expect(result.contents).toContain('id: number');
      expect(result.contents).toContain('email: string');
      expect(result.contents).toContain('active: boolean');
    } finally {
      rmSync(rootDir, { recursive: true, force: true });
    }
  });

  test('uses DDL schema model for mutation RETURNING type hints', () => {
    const rootDir = mkdtempSync(path.join(tmpdir(), 'ashiba-model-gen-returning-ddl-types-'));

    try {
      mkdirSync(path.join(rootDir, 'db', 'ddl'), { recursive: true });
      writeFileSync(path.join(rootDir, 'db/ddl/public.sql'), [
        'create table public.users (',
        '  user_id integer primary key,',
        '  email text not null',
        ');',
        '',
      ].join('\n'), 'utf8');
      const sqlDir = path.join(rootDir, 'src/features/users/queries/create');
      const sqlPath = path.join(sqlDir, 'create.sql');
      mkdirSync(sqlDir, { recursive: true });
      writeFileSync(sqlPath, [
        'insert into public.users (email)',
        'values (:email)',
        'returning user_id as id, email;',
        '',
      ].join('\n'), 'utf8');

      const result = runModelGen({ rootDir, sqlFile: 'src/features/users/queries/create/create.sql' });

      expect(result.resultColumns).toEqual(['email', 'id']);
      expect(result.analysis.resultColumnTypes).toEqual({
        email: 'string',
        id: 'number',
      });
      expect(result.contents).toContain('id: number');
      expect(result.contents).toContain('email: string');
    } finally {
      rmSync(rootDir, { recursive: true, force: true });
    }
  });

  test('uses DDL schema model for simple nullable expression type hints', () => {
    const rootDir = mkdtempSync(path.join(tmpdir(), 'ashiba-model-gen-ddl-expression-types-'));

    try {
      mkdirSync(path.join(rootDir, 'db', 'ddl'), { recursive: true });
      writeFileSync(path.join(rootDir, 'db/ddl/public.sql'), [
        'create table public.users (',
        '  user_id integer primary key,',
        '  display_name text',
        ');',
        '',
      ].join('\n'), 'utf8');
      const sqlDir = path.join(rootDir, 'src/features/users/queries/profile');
      const sqlPath = path.join(sqlDir, 'profile.sql');
      mkdirSync(sqlDir, { recursive: true });
      writeFileSync(sqlPath, [
        'select',
        "  coalesce(u.display_name, 'Anonymous') as display_name,",
        '  nullif(u.user_id, 0) as optional_id',
        'from public.users u',
        'where u.user_id = :user_id;',
        '',
      ].join('\n'), 'utf8');

      const result = runModelGen({ rootDir, sqlFile: 'src/features/users/queries/profile/profile.sql' });

      expect(result.resultColumns).toEqual(['display_name', 'optional_id']);
      expect(result.analysis.resultColumnTypes).toEqual({
        display_name: 'string',
        optional_id: 'number',
      });
      expect(result.contents).toContain('display_name: string');
      expect(result.contents).toContain('optional_id: number');
    } finally {
      rmSync(rootDir, { recursive: true, force: true });
    }
  });

  test('uses DDL schema model for common computed expression type hints', () => {
    const rootDir = mkdtempSync(path.join(tmpdir(), 'ashiba-model-gen-computed-expression-types-'));

    try {
      mkdirSync(path.join(rootDir, 'db', 'ddl'), { recursive: true });
      writeFileSync(path.join(rootDir, 'db/ddl/public.sql'), [
        'create table public.orders (',
        '  order_id integer primary key,',
        '  quantity integer not null,',
        '  unit_price numeric not null,',
        '  status text not null,',
        '  shipped_at timestamp null',
        ');',
        '',
      ].join('\n'), 'utf8');
      const sqlDir = path.join(rootDir, 'src/features/orders/queries/summary');
      const sqlPath = path.join(sqlDir, 'summary.sql');
      mkdirSync(sqlDir, { recursive: true });
      writeFileSync(sqlPath, [
        'select',
        '  o.quantity * o.unit_price as total_amount,',
        '  o.shipped_at is not null as shipped,',
        "  case when o.status = 'paid' then 'closed' else 'open' end as lifecycle,",
        "  'order-' || o.order_id as external_id",
        'from public.orders o',
        'where o.order_id = :order_id;',
        '',
      ].join('\n'), 'utf8');

      const result = runModelGen({ rootDir, sqlFile: 'src/features/orders/queries/summary/summary.sql' });

      expect(result.resultColumns).toEqual(['external_id', 'lifecycle', 'shipped', 'total_amount']);
      expect(result.analysis.resultColumnTypes).toEqual({
        external_id: 'string',
        lifecycle: 'string',
        shipped: 'boolean',
        total_amount: 'string',
      });
      expect(result.contents).toContain('total_amount: string');
      expect(result.contents).toContain('shipped: boolean');
      expect(result.contents).toContain('lifecycle: string');
      expect(result.contents).toContain('external_id: string');
    } finally {
      rmSync(rootDir, { recursive: true, force: true });
    }
  });

  test('propagates DDL-backed result types through CTE aliases', () => {
    const rootDir = mkdtempSync(path.join(tmpdir(), 'ashiba-model-gen-cte-result-types-'));

    try {
      mkdirSync(path.join(rootDir, 'db', 'ddl'), { recursive: true });
      writeFileSync(path.join(rootDir, 'db/ddl/public.sql'), [
        'create table public.tickets (',
        '  ticket_id bigint primary key,',
        '  subject text not null,',
        '  sla_due_at timestamptz,',
        '  created_at timestamptz not null',
        ');',
        'create table public.ticket_tags (',
        '  ticket_id bigint not null,',
        '  slug text not null',
        ');',
        'create table public.ticket_messages (',
        '  ticket_id bigint not null,',
        '  body text not null,',
        '  created_at timestamptz not null',
        ');',
        '',
      ].join('\n'), 'utf8');
      const sqlDir = path.join(rootDir, 'src/features/tickets/queries/list');
      const sqlPath = path.join(sqlDir, 'list.sql');
      mkdirSync(sqlDir, { recursive: true });
      writeFileSync(sqlPath, [
        'with filtered_tickets as (',
        '  select',
        '    t.ticket_id,',
        '    t.subject,',
        '    t.sla_due_at,',
        '    t.created_at',
        '  from public.tickets t',
        '),',
        'aggregated_tags as (',
        '  select',
        '    tt.ticket_id,',
        '    array_agg(tt.slug order by tt.slug) as tag_slugs',
        '  from public.ticket_tags tt',
        '  group by tt.ticket_id',
        '),',
        'latest_message as (',
        '  select ranked.ticket_id, ranked.body, ranked.created_at',
        '  from (',
        '    select tm.ticket_id, tm.body, tm.created_at',
        '    from public.ticket_messages tm',
        '  ) ranked',
        ')',
        'select',
        '  ft.ticket_id,',
        '  ft.subject,',
        '  ft.sla_due_at,',
        '  ft.created_at,',
        '  lm.body as latest_message_body,',
        '  lm.created_at as latest_message_at,',
        '  coalesce(tags.tag_slugs, cast(array[] as text[])) as tag_slugs',
        'from filtered_tickets ft',
        'left join aggregated_tags tags on tags.ticket_id = ft.ticket_id',
        'left join latest_message lm on lm.ticket_id = ft.ticket_id;',
        '',
      ].join('\n'), 'utf8');

      const result = runModelGen({ rootDir, sqlFile: 'src/features/tickets/queries/list/list.sql' });

      expect(result.analysis.resultColumnTypes).toEqual({
        created_at: 'string',
        latest_message_at: 'string',
        latest_message_body: 'string',
        sla_due_at: 'string',
        subject: 'string',
        tag_slugs: 'string[]',
        ticket_id: 'string',
      });
      expect(result.contents).toContain('created_at: string');
      expect(result.contents).toContain('tag_slugs: string[]');
    } finally {
      rmSync(rootDir, { recursive: true, force: true });
    }
  });

  test('records query model analysis for top-level ORDER BY without proprietary SQL markers', () => {
    const rootDir = mkdtempSync(path.join(tmpdir(), 'ashiba-model-gen-analysis-'));

    try {
      const sqlDir = path.join(rootDir, 'src/features/users/queries/list');
      const sqlPath = path.join(sqlDir, 'list.sql');
      mkdirSync(sqlDir, { recursive: true });
      writeFileSync(sqlPath, [
        'select user_id, email',
        'from public.users',
        'where status = :status',
        'order by user_id',
        '',
      ].join('\n'), 'utf8');

      const result = runModelGen({ rootDir, sqlFile: 'src/features/users/queries/list/list.sql' });

      expect(result.analysis).toMatchObject({
        astParse: 'ok',
        statementKind: 'select',
        rootQueryShape: 'simple-select',
        hasTopLevelOrderBy: true,
        safeSort: {
          insertion: {
            status: 'ready',
            mode: 'prepend-comma',
          },
          sortable: {
            email: { sql: 'email' },
            user_id: { sql: 'user_id' },
          },
        },
      });
      expect(result.metadataContents).toContain('"hasTopLevelOrderBy": true');
      expect(result.metadataContents).toContain('"sourceHash": "sha256:');
    } finally {
      rmSync(rootDir, { recursive: true, force: true });
    }
  });

  test('records safe sort insertion before LIMIT without proprietary SQL markers', () => {
    const rootDir = mkdtempSync(path.join(tmpdir(), 'ashiba-model-gen-safe-sort-limit-'));

    try {
      const sqlDir = path.join(rootDir, 'src/features/users/queries/page');
      const sqlPath = path.join(sqlDir, 'page.sql');
      mkdirSync(sqlDir, { recursive: true });
      writeFileSync(sqlPath, [
        'select a.user_id as id, a.email',
        'from public.users a',
        'where a.status = :status',
        'limit :limit',
        'offset :offset',
        '',
      ].join('\n'), 'utf8');

      const result = runModelGen({ rootDir, sqlFile: 'src/features/users/queries/page/page.sql' });

      expect(result.analysis.safeSort.insertion).toMatchObject({
        status: 'ready',
        mode: 'order-by',
      });
      expect(result.analysis.safeSort.insertion.status === 'ready' ? result.analysis.safeSort.insertion.index : -1)
        .toBe(readFileSync(sqlPath, 'utf8').indexOf('limit :limit'));
      expect(result.analysis.safeSort.sortable).toMatchObject({
        id: { sql: 'a.user_id' },
        email: { sql: 'a.email' },
      });
    } finally {
      rmSync(rootDir, { recursive: true, force: true });
    }
  });

  test('records safe sort insertion before WINDOW without runtime clause realignment', () => {
    const rootDir = mkdtempSync(path.join(tmpdir(), 'ashiba-model-gen-safe-sort-window-'));

    try {
      const sqlDir = path.join(rootDir, 'src/features/users/queries/windowed');
      const sqlPath = path.join(sqlDir, 'windowed.sql');
      mkdirSync(sqlDir, { recursive: true });
      writeFileSync(sqlPath, [
        'select a.user_id as id, row_number() over w as row_no',
        'from public.users a',
        'where a.status = :status',
        'window w as (partition by a.tenant_id order by a.created_at desc)',
        'limit :limit',
        '',
      ].join('\n'), 'utf8');

      const result = runModelGen({ rootDir, sqlFile: 'src/features/users/queries/windowed/windowed.sql' });

      expect(result.analysis.safeSort.insertion).toMatchObject({
        status: 'ready',
        mode: 'order-by',
      });
      expect(result.analysis.safeSort.insertion.status === 'ready' ? result.analysis.safeSort.insertion.index : -1)
        .toBe(readFileSync(sqlPath, 'utf8').indexOf('window w'));
    } finally {
      rmSync(rootDir, { recursive: true, force: true });
    }
  });

  test('records safe sort metadata through ordinary SQL comments and FETCH clauses', () => {
    const rootDir = mkdtempSync(path.join(tmpdir(), 'ashiba-model-gen-safe-sort-comments-'));

    try {
      const sqlDir = path.join(rootDir, 'src/features/users/queries/commented-page');
      const sqlPath = path.join(sqlDir, 'commented-page.sql');
      mkdirSync(sqlDir, { recursive: true });
      writeFileSync(sqlPath, [
        'select',
        '  u.user_id as id -- comment with comma, semicolon; and union keyword',
        'from public.users u',
        'where u.status = :status',
        'fetch first 10 rows only',
        '',
      ].join('\n'), 'utf8');

      const result = runModelGen({ rootDir, sqlFile: 'src/features/users/queries/commented-page/commented-page.sql' });

      expect(result.analysis.rootQueryShape).toBe('simple-select');
      expect(result.analysis.safeSort.insertion).toMatchObject({
        status: 'ready',
        mode: 'order-by',
      });
      expect(result.analysis.safeSort.insertion.status === 'ready' ? result.analysis.safeSort.insertion.index : -1)
        .toBe(readFileSync(sqlPath, 'utf8').indexOf('fetch first'));
      expect(result.analysis.safeSort.sortable).toEqual({
        id: { sql: 'u.user_id' },
      });
    } finally {
      rmSync(rootDir, { recursive: true, force: true });
    }
  });

  test('records safe sort metadata through postgres dollar-quoted strings', () => {
    const rootDir = mkdtempSync(path.join(tmpdir(), 'ashiba-model-gen-safe-sort-dollar-quote-'));

    try {
      const sqlDir = path.join(rootDir, 'src/features/users/queries/dollar-commented');
      const sqlPath = path.join(sqlDir, 'dollar-commented.sql');
      mkdirSync(sqlDir, { recursive: true });
      writeFileSync(sqlPath, [
        'select',
        '  u.user_id as id,',
        '  $tag$order by fake_column, :not_param;$tag$ as note',
        'from public.users u',
        'where u.status = :status',
        'limit :limit',
        '',
      ].join('\n'), 'utf8');

      const result = runModelGen({ rootDir, sqlFile: 'src/features/users/queries/dollar-commented/dollar-commented.sql' });

      expect(result.parameters).toEqual(['status', 'limit']);
      expect(result.analysis.safeSort.insertion).toMatchObject({
        status: 'ready',
        mode: 'order-by',
      });
      expect(result.analysis.safeSort.insertion.status === 'ready' ? result.analysis.safeSort.insertion.index : -1)
        .toBe(readFileSync(sqlPath, 'utf8').indexOf('limit :limit'));
      expect(result.analysis.safeSort.sortable).toMatchObject({
        id: { sql: 'u.user_id' },
        note: { sql: '$tag$order by fake_column, :not_param;$tag$' },
      });
    } finally {
      rmSync(rootDir, { recursive: true, force: true });
    }
  });

  test('records safe sort metadata through postgres escape strings', () => {
    const rootDir = mkdtempSync(path.join(tmpdir(), 'ashiba-model-gen-safe-sort-escape-string-'));

    try {
      const sqlDir = path.join(rootDir, 'src/features/users/queries/escape-string');
      const sqlPath = path.join(sqlDir, 'escape-string.sql');
      mkdirSync(sqlDir, { recursive: true });
      writeFileSync(sqlPath, [
        'select',
        String.raw`  E'it\'s order by fake_column, :not_param; limit 1' as note,`,
        '  u.user_id as id',
        'from public.users u',
        'where u.status = :status',
        'limit :limit',
        '',
      ].join('\n'), 'utf8');

      const result = runModelGen({ rootDir, sqlFile: 'src/features/users/queries/escape-string/escape-string.sql' });

      expect(result.parameters).toEqual(['status', 'limit']);
      expect(result.analysis.safeSort.insertion).toMatchObject({
        status: 'ready',
        mode: 'order-by',
      });
      expect(result.analysis.safeSort.insertion.status === 'ready' ? result.analysis.safeSort.insertion.index : -1)
        .toBe(readFileSync(sqlPath, 'utf8').indexOf('limit :limit'));
      expect(result.analysis.safeSort.sortable).toMatchObject({
        note: { sql: String.raw`E'it\'s order by fake_column, :not_param; limit 1'` },
        id: { sql: 'u.user_id' },
      });
    } finally {
      rmSync(rootDir, { recursive: true, force: true });
    }
  });

  test('records safe sort insertion before FOR UPDATE without proprietary SQL markers', () => {
    const rootDir = mkdtempSync(path.join(tmpdir(), 'ashiba-model-gen-safe-sort-for-update-'));

    try {
      const sqlDir = path.join(rootDir, 'src/features/users/queries/lock-one');
      const sqlPath = path.join(sqlDir, 'lock-one.sql');
      mkdirSync(sqlDir, { recursive: true });
      writeFileSync(sqlPath, [
        'select u.user_id as id, u.email',
        'from public.users u',
        'where u.user_id = :user_id',
        'for update',
        '',
      ].join('\n'), 'utf8');

      const result = runModelGen({ rootDir, sqlFile: 'src/features/users/queries/lock-one/lock-one.sql' });

      expect(result.analysis.rootQueryShape).toBe('simple-select');
      expect(result.analysis.safeSort.insertion).toMatchObject({
        status: 'ready',
        mode: 'order-by',
      });
      expect(result.analysis.safeSort.insertion.status === 'ready' ? result.analysis.safeSort.insertion.index : -1)
        .toBe(readFileSync(sqlPath, 'utf8').indexOf('for update'));
      expect(result.analysis.safeSort.sortable).toMatchObject({
        id: { sql: 'u.user_id' },
        email: { sql: 'u.email' },
      });
    } finally {
      rmSync(rootDir, { recursive: true, force: true });
    }
  });

  test('marks root compound SELECT safe sort metadata unresolved with subquery guidance', () => {
    const rootDir = mkdtempSync(path.join(tmpdir(), 'ashiba-model-gen-safe-sort-union-'));

    try {
      const sqlDir = path.join(rootDir, 'src/features/users/queries/union-list');
      const sqlPath = path.join(sqlDir, 'union-list.sql');
      mkdirSync(sqlDir, { recursive: true });
      writeFileSync(sqlPath, [
        'select user_id as id from public.active_users',
        'union all',
        'select user_id as id from public.archived_users',
        '',
      ].join('\n'), 'utf8');

      const result = runModelGen({ rootDir, sqlFile: 'src/features/users/queries/union-list/union-list.sql' });

      expect(result.analysis.rootQueryShape).toBe('compound-select');
      expect(result.analysis.safeSort).toEqual({
        insertion: {
          status: 'unresolved',
          reason: 'Root compound SELECT safe sort is not supported. Wrap the compound query in a subquery and expose stable sortable columns.',
        },
        sortable: {},
      });
      expect(result.metadataContents).toContain('Wrap the compound query in a subquery');
    } finally {
      rmSync(rootDir, { recursive: true, force: true });
    }
  });

  test('checks result column drift for aliased SQL query boundaries', () => {
    const rootDir = mkdtempSync(path.join(tmpdir(), 'ashiba-generated-alias-result-check-'));

    try {
      const queryDir = path.join(rootDir, 'src/features/users-search/queries/search-users');
      mkdirSync(queryDir, { recursive: true });
      writeFileSync(path.join(queryDir, 'search-users.sql'), [
        'select',
        '  u.user_id as id,',
        '  lower(u.email) as normalized_email',
        'from public.users u',
        'where u.email = :email;',
        '',
      ].join('\n'), 'utf8');
      writeFileSync(path.join(queryDir, 'query.ts'), [
        'export interface SearchUsersQueryParams {',
        '  email: string;',
        '}',
        '',
        'export interface SearchUsersQueryResult {',
        '  id: number;',
        '  email: string;',
        '}',
        '',
      ].join('\n'), 'utf8');

      const result = runFeatureGeneratedMapperCheck({ rootDir, feature: 'users-search', query: 'search-users' });

      expect(result.ok).toBe(false);
      expect(result.checked[0]?.missingResultInMapper).toEqual(['normalized_email']);
      expect(result.checked[0]?.unusedResultInMapper).toEqual(['email']);
    } finally {
      rmSync(rootDir, { recursive: true, force: true });
    }
  });

  test('scaffolds and inspects traditional performance lane plans', () => {
    const rootDir = mkdtempSync(path.join(tmpdir(), 'ashiba-perf-'));

    try {
      const sqlDir = path.join(rootDir, 'sql');
      mkdirSync(sqlDir, { recursive: true });
      writeFileSync(path.join(sqlDir, 'users.sql'), 'select id from public.users where id = :id;', 'utf8');
      writeFileSync(path.join(rootDir, 'params.json'), JSON.stringify({ id: 1 }), 'utf8');

      const init = runPerfInit({ rootDir });
      const plan = runPerfRun({ rootDir, query: 'sql/users.sql', params: 'params.json', dryRun: true });

      expect(init.files.some((file) => file.path === 'perf/README.md')).toBe(true);
      expect(plan.mode).toBe('traditional');
      expect(plan.ok).toBe(true);
      expect(plan.attainment).toEqual({ overall: 'done', nextActions: [] });
      expect(plan.parameterNames).toEqual(['id']);

      const missing = runPerfRun({ rootDir, query: 'sql/users.sql', dryRun: true });
      expect(missing.ok).toBe(false);
      expect(missing.attainment).toMatchObject({
        overall: 'partial',
        nextActions: ['Add missing benchmark parameters before running the application-owned performance test.'],
      });
    } finally {
      rmSync(rootDir, { recursive: true, force: true });
    }
  });

  test('compares saved performance report durations', () => {
    const rootDir = mkdtempSync(path.join(tmpdir(), 'ashiba-perf-diff-'));

    try {
      const baseline = path.join(rootDir, 'baseline.json');
      const candidate = path.join(rootDir, 'candidate.json');
      writeFileSync(baseline, JSON.stringify({ durationMs: 100 }), 'utf8');
      writeFileSync(candidate, JSON.stringify({ durationMs: 125 }), 'utf8');

      const result = runPerfReportDiff(baseline, candidate);

      expect(result.deltaMs).toBe(25);
      expect(result.classification).toBe('slower');
      expect(result.attainment).toEqual({ overall: 'done', nextActions: [] });

      writeFileSync(candidate, JSON.stringify({ metrics: {} }), 'utf8');
      const unknown = runPerfReportDiff(baseline, candidate);
      expect(unknown.classification).toBe('unknown');
      expect(unknown.attainment).toMatchObject({
        overall: 'partial',
        nextActions: ['Add a numeric durationMs or duration_ms to the candidate performance report.'],
      });
    } finally {
      rmSync(rootDir, { recursive: true, force: true });
    }
  });

  test('records manual performance tuning scenario evidence and index policy', () => {
    const rootDir = mkdtempSync(path.join(tmpdir(), 'ashiba-perf-scenario-'));

    try {
      mkdirSync(path.join(rootDir, 'src/features/users-list/queries/list'), { recursive: true });
      writeFileSync(path.join(rootDir, 'src/features/users-list/queries/list/list.sql'), 'select id from public.users where email = :email;', 'utf8');
      writeFileSync(path.join(rootDir, 'explain.json'), JSON.stringify([{ Plan: { 'Node Type': 'Seq Scan' } }]), 'utf8');

      const init = runPerfScenarioInit({
        rootDir,
        scenario: 'users-list',
        query: 'src/features/users-list/queries/list/list.sql',
        targetRows: ['public.users=100000'],
        maxDurationMs: '100',
        timeoutMs: '30000',
      });

      expect(init.requirements).toEqual({
        targetRows: { 'public.users': 100000 },
        maxDurationMs: 100,
        timeoutMs: 30000,
      });
      expect(init.indexPolicy).toMatchObject({
        candidateIndexScope: 'sandbox-only',
        adoptedIndexTarget: 'db/ddl',
      });
      expect(readFileSync(path.join(rootDir, 'perf/scenarios/users-list/README.md'), 'utf8')).toContain('Accepted indexes must be promoted into db/ddl');
      expect(() => runPerfScenarioInit({
        rootDir,
        scenario: 'missing-query',
        query: 'src/features/users-list/queries/list/missing.sql',
      })).toThrow('file was not found');
      expect(() => runPerfScenarioInit({
        rootDir,
        scenario: 'duplicate-target-rows',
        targetRows: ['public.users=100000', 'public.users=200000'],
      })).toThrow('Duplicate target rows entry');

      const measurement = runPerfScenarioMeasure({
        rootDir,
        scenario: 'users-list',
        durationMs: '182.4',
        explain: 'explain.json',
        evidenceName: 'candidate-001',
      });

      expect(measurement.recorded).toBe(true);
      expect(measurement.result).toEqual({
        durationMs: 182.4,
        timedOut: false,
        meetsRequirement: false,
      });
      expect(measurement.evidence.measurementPath).toBe('perf/scenarios/users-list/evidence/candidate-001.json');
      expect(measurement.evidence.explainCollected).toBe(true);
      expect(measurement.nextActions).toContain('Accepted indexes must be written to db/ddl before they become product schema.');
      expect(JSON.parse(readFileSync(path.join(rootDir, 'perf/scenarios/users-list/evidence/candidate-001.json'), 'utf8'))).toMatchObject({
        scenario: 'users-list',
        result: { durationMs: 182.4, meetsRequirement: false },
        evidence: { explainCollected: true },
        indexPolicy: { candidateIndexScope: 'sandbox-only' },
      });
      expect(() => runPerfScenarioMeasure({
        rootDir,
        scenario: 'users-list',
        durationMs: '42',
        explain: 'missing-explain.json',
      })).toThrow('file was not found');

      const timedOut = runPerfScenarioMeasure({
        rootDir,
        scenario: 'users-list',
        timedOut: true,
        evidenceName: 'timeout',
        dryRun: true,
      });
      expect(timedOut.recorded).toBe(true);
      expect(timedOut.result).toMatchObject({ durationMs: null, timedOut: true, meetsRequirement: false });
      expect(timedOut.nextActions[0]).toContain('Treat the timeout as performance evidence');
      expect(timedOut.nextActions).toContain('Collect EXPLAIN evidence and pass --explain on the next measurement so the timing result has a plan to review.');
      expect(existsSync(path.join(rootDir, 'perf/scenarios/users-list/evidence/timeout.json'))).toBe(false);
    } finally {
      rmSync(rootDir, { recursive: true, force: true });
    }
  });

  test('inspects RFBA boundaries', () => {
    const rootDir = mkdtempSync(path.join(tmpdir(), 'ashiba-rfba-'));

    try {
      mkdirSync(path.join(rootDir, 'db', 'ddl'), { recursive: true });
      writeFileSync(path.join(rootDir, 'db', 'ddl', 'public.sql'), 'create table public.users (user_id integer primary key, email text not null);', 'utf8');
      runFeatureScaffold({ rootDir, table: 'users', action: 'list' });

      const rfba = runRfbaInspect({ rootDir });

      expect(rfba.attainment).toMatchObject({
        overall: 'done',
        issueCount: 0,
        nextActions: [],
      });
      expect(rfba.features[0]?.boundary).toEqual({
        path: 'src/features/users-list/boundary.ts',
        exists: true,
      });
      expect(rfba.features[0]?.standard).toEqual({
        status: 'standard',
        warnings: [],
      });
      expect(rfba.features[0]?.queries[0]?.sql).toEqual({
        path: 'src/features/users-list/queries/list/list.sql',
        exists: true,
      });
    } finally {
      rmSync(rootDir, { recursive: true, force: true });
    }
  });

  test('reports RFBA standard drift as warnings without failing ownership checks', () => {
    const rootDir = mkdtempSync(path.join(tmpdir(), 'ashiba-rfba-standard-warning-'));

    try {
      const featureDir = path.join(rootDir, 'src/features/users-list');
      const queryDir = path.join(featureDir, 'queries/list');
      mkdirSync(queryDir, { recursive: true });
      writeFileSync(path.join(featureDir, 'boundary.ts'), [
        'export type { UsersListRequest } from \'./input.js\';',
        'export async function execute(): Promise<void> {}',
        'export async function customEntrypoint(): Promise<void> {}',
        '',
      ].join('\n'), 'utf8');
      writeFileSync(path.join(featureDir, 'input.ts'), 'export function parseInput(raw: unknown): unknown { return raw; }\n', 'utf8');
      writeFileSync(path.join(featureDir, 'workflow.ts'), 'export async function executeWorkflow(raw: unknown): Promise<unknown> { return raw; }\n', 'utf8');
      writeFileSync(path.join(featureDir, 'output.ts'), 'export function buildOutput(value: unknown): unknown { return value; }\n', 'utf8');
      writeFileSync(path.join(queryDir, 'query.ts'), 'export {};\n', 'utf8');
      writeFileSync(path.join(queryDir, 'list.sql'), 'select 1;\n', 'utf8');

      const rfba = runRfbaInspect({ rootDir });

      expect(rfba.attainment).toMatchObject({
        overall: 'done',
        issueCount: 0,
        nextActions: [],
      });
      expect(rfba.features[0]?.standard.status).toBe('custom');
      expect(rfba.features[0]?.standard.warnings).toEqual([
        'Boundary exposes multiple runtime entrypoints (execute, customEntrypoint); RFBA expects one primary function entrypoint, usually execute. Split the boundary or mark this as custom-owned code if the extra entrypoints are intentional.',
        'Input boundary should expose parseRequest(raw: unknown): src/features/users-list/input.ts.',
        'Workflow should expose a Queries interface so query dependencies stay injectable: src/features/users-list/workflow.ts.',
        'Workflow should receive parsed input, not raw unknown input: src/features/users-list/workflow.ts.',
        'Output boundary should expose buildResult(...): src/features/users-list/output.ts.',
      ]);
    } finally {
      rmSync(rootDir, { recursive: true, force: true });
    }
  });

  test('reports RFBA boundary gaps with next actions', () => {
    const rootDir = mkdtempSync(path.join(tmpdir(), 'ashiba-rfba-gaps-'));

    try {
      const queryDir = path.join(rootDir, 'src/features/users-list/queries/list');
      mkdirSync(queryDir, { recursive: true });
      writeFileSync(path.join(queryDir, 'list.sql'), 'select user_id from public.users;', 'utf8');

      const rfba = runRfbaInspect({ rootDir });

      expect(rfba.attainment.overall).toBe('partial');
      expect(rfba.attainment.issueCount).toBe(2);
      expect(rfba.attainment.nextActions).toEqual([
        'Add feature boundary.ts files so reviewers can enter through feature behavior.',
        'Add query.ts files that expose editable mapper/query contracts.',
      ]);
      expect(rfba.features[0]?.issues).toEqual([
        'Feature boundary file is missing: src/features/users-list/boundary.ts.',
      ]);
      expect(rfba.features[0]?.queries[0]?.issues).toEqual([
        'Query file is missing: src/features/users-list/queries/list/query.ts.',
      ]);
    } finally {
      rmSync(rootDir, { recursive: true, force: true });
    }
  });

  test('summarizes, graphs, and slices CTE-heavy SQL files', () => {
    const rootDir = mkdtempSync(path.join(tmpdir(), 'ashiba-query-structure-'));

    try {
      const sqlPath = path.join(rootDir, 'cte.sql');
      writeFileSync(sqlPath, `
        WITH base AS (
          SELECT id, email FROM public.users
        ),
        filtered AS (
          SELECT id, email FROM base WHERE email IS NOT NULL
        )
        SELECT * FROM filtered;
      `, 'utf8');

      const outline = runQueryStructure(sqlPath);
      const graph = runQueryStructure(sqlPath, { format: 'dot' });
      const slice = runQuerySlice(sqlPath, { cte: 'filtered', limit: '5' });

      expect(outline).toContain('CTE count: 2');
      expect(graph).toContain('digraph query_structure');
      expect(slice).toContain('from "filtered"');
    } finally {
      rmSync(rootDir, { recursive: true, force: true });
    }
  });

  test('lints structural query maintainability risks', () => {
    const rootDir = mkdtempSync(path.join(tmpdir(), 'ashiba-query-lint-'));

    try {
      const sqlPath = path.join(rootDir, 'dynamic.sql');
      writeFileSync(sqlPath, `
        WITH unused AS (
          SELECT id FROM public.users
        )
        SELECT id FROM public.users WHERE id = \${userId};
      `, 'utf8');

      const output = runQueryLint(sqlPath, { rootDir });

      expect(output).toContain('unused-cte');
      expect(output).toContain('analysis-risk');
    } finally {
      rmSync(rootDir, { recursive: true, force: true });
    }
  });

  test('allows DBMS-natural string concatenation inside supported SSSQL keyword branches', () => {
    const rootDir = mkdtempSync(path.join(tmpdir(), 'ashiba-query-lint-sssql-keyword-'));

    try {
      const sqlPath = path.join(rootDir, 'search.sql');
      writeFileSync(sqlPath, `
        SELECT id, email
        FROM public.users
        WHERE (:keyword is null or email ilike '%' || :keyword || '%');
      `, 'utf8');

      const output = runQueryLint(sqlPath, { rootDir });

      expect(output).toContain('No query lint issues detected.');
      expect(output).not.toContain('analysis-risk');
    } finally {
      rmSync(rootDir, { recursive: true, force: true });
    }
  });

  test('formats SQL with Ashiba defaults and refuses comment-losing writes', () => {
    const rootDir = mkdtempSync(path.join(tmpdir(), 'ashiba-query-format-'));

    try {
      const sqlPath = path.join(rootDir, 'users.sql');
      writeFileSync(sqlPath, 'select id, email from public.users where active = :active and email = :email;\n', 'utf8');

      const report = runQueryFormat(sqlPath, { rootDir });

      expect(report.safe).toBe(true);
      expect(report.changed).toBe(true);
      expect(report.sql).toContain('select\n    id\n    , email');
      expect(report.sql).toContain('where\n    active = :active\n    and email = :email');

      const commentedPath = path.join(rootDir, 'commented.sql');
      writeFileSync(commentedPath, 'select id -- keep this review note\nfrom public.users;\n', 'utf8');
      const commented = runQueryFormat(commentedPath, { rootDir, write: true });

      expect(commented.safe).toBe(false);
      expect(commented.written).toBe(false);
      expect(readFileSync(commentedPath, 'utf8')).toContain('-- keep this review note');
    } finally {
      rmSync(rootDir, { recursive: true, force: true });
    }
  });

  test('allows formatter-owned token normalization when AST round-trip is stable', () => {
    const rootDir = mkdtempSync(path.join(tmpdir(), 'ashiba-query-format-token-normalization-'));

    try {
      const sqlPath = path.join(rootDir, 'users.sql');
      writeFileSync(sqlPath, 'select id::bigint as id from public.users u order by u.created_at asc\n', 'utf8');

      const report = runQueryFormat(sqlPath, { rootDir, write: true });

      expect(report.safe).toBe(true);
      expect(report.written).toBe(true);
      expect(report.tokenCountBefore).not.toBe(report.tokenCountAfter);
      const formattedSql = readFileSync(sqlPath, 'utf8');
      expect(formattedSql).toContain('cast(id as bigint) as id');
      expect(formattedSql).toContain('order by\n    u.created_at;');
    } finally {
      rmSync(rootDir, { recursive: true, force: true });
    }
  });

  test('refreshes query metadata after writing formatted SQL', () => {
    const rootDir = mkdtempSync(path.join(tmpdir(), 'ashiba-query-format-metadata-'));

    try {
      writePostgresStarterPackageJson(rootDir);
      runInit({ dir: rootDir, db: 'postgres', driver: 'pg', withDemoDdl: true });
      runFeatureScaffold({ rootDir, featureName: 'users-list', table: 'users', action: 'list' });
      const sqlPath = path.join(rootDir, 'src/features/users-list/queries/list/list.sql');
      const metadataPath = path.join(rootDir, 'src/features/users-list/queries/list/generated/query.meta.ts');
      const staleMetadata = readFileSync(metadataPath, 'utf8');
      writeFileSync(sqlPath, 'select user_id, email, display_name, login_count, external_account_id from public.users;\n', 'utf8');

      const report = runQueryFormat(sqlPath, { rootDir, write: true });

      expect(report.written).toBe(true);
      expect(report.metadataRefreshed).toBe(true);
      expect(report.metadataFile).toBe(metadataPath.split(path.sep).join('/'));
      expect(readFileSync(metadataPath, 'utf8')).not.toBe(staleMetadata);
      const formattedSql = readFileSync(sqlPath, 'utf8');
      const formattedHash = `sha256:${createHash('sha256').update(formattedSql).digest('hex')}`;
      expect(readFileSync(metadataPath, 'utf8')).toContain(`"sourceHash": "${formattedHash}"`);
    } finally {
      rmSync(rootDir, { recursive: true, force: true });
    }
  });

  test('formats all configured SQL roots in stable order', () => {
    const rootDir = mkdtempSync(path.join(tmpdir(), 'ashiba-query-format-all-'));

    try {
      mkdirSync(path.join(rootDir, 'src/features/a'), { recursive: true });
      mkdirSync(path.join(rootDir, 'src/features/b'), { recursive: true });
      writeFileSync(path.join(rootDir, 'ashiba.config.json'), JSON.stringify({ sqlRoots: ['src/features'] }), 'utf8');
      writeFileSync(path.join(rootDir, 'src/features/b/b.sql'), 'select id, email from public.users;\n', 'utf8');
      writeFileSync(path.join(rootDir, 'src/features/a/a.sql'), 'select id, email from public.users;\n', 'utf8');

      const report = runQueryFormatAll({ rootDir, write: true });

      expect(report.files.map((entry) => path.relative(rootDir, entry.file).split(path.sep).join('/'))).toEqual([
        'src/features/a/a.sql',
        'src/features/b/b.sql',
      ]);
      expect(report.written).toBe(2);
      expect(readFileSync(path.join(rootDir, 'src/features/a/a.sql'), 'utf8')).toContain('select\n    id\n    , email');
    } finally {
      rmSync(rootDir, { recursive: true, force: true });
    }
  });

  test('reports invalid ashiba.config.json while formatting SQL', () => {
    const rootDir = mkdtempSync(path.join(tmpdir(), 'ashiba-query-format-config-'));

    try {
      const sqlPath = path.join(rootDir, 'users.sql');
      writeFileSync(path.join(rootDir, 'ashiba.config.json'), '{ invalid json', 'utf8');
      writeFileSync(sqlPath, 'select id from public.users;\n', 'utf8');

      expect(catchError(() => runQueryFormat(sqlPath, { rootDir }))).toMatchObject({
        code: 'ASHIBA_CONFIG_JSON_PARSE_FAILED',
      });
    } finally {
      rmSync(rootDir, { recursive: true, force: true });
    }
  });

  test('adds SQL-first optional filter branches and refreshes metadata', () => {
    const rootDir = mkdtempSync(path.join(tmpdir(), 'ashiba-query-optional-add-'));

    try {
      const sqlPath = path.join(rootDir, 'users.sql');
      const outPath = path.join(rootDir, 'users.optional.sql');
      writeFileSync(sqlPath, `
        SELECT u.id, u.status
        FROM users as u
        WHERE u.active = true
      `, 'utf8');

      const add = runQueryOptionalAdd(sqlPath, { filter: 'status', out: outPath });

      expect(add).toContain('query optional add');
      const rewrittenSql = readFileSync(outPath, 'utf8');
      expect(rewrittenSql.toLowerCase()).toContain(':status is null');
      expect(rewrittenSql).toContain('SELECT u.id, u.status');
      expect(rewrittenSql).toContain('FROM users as u');
      const metadata = readFileSync(path.join(rootDir, 'generated', 'query.meta.ts'), 'utf8');
      expect(metadata).toContain('"optionalConditionCompression"');
      expect(metadata).toContain('"parameterName": "status"');
    } finally {
      rmSync(rootDir, { recursive: true, force: true });
    }
  });

  test('applies optional filter branches without full SQL reformat', () => {
    const rootDir = mkdtempSync(path.join(tmpdir(), 'ashiba-query-optional-minimal-'));

    try {
      const sqlPath = path.join(rootDir, 'users.sql');
      writeFileSync(sqlPath, `
        SELECT u.id, u.status
        FROM users u
        WHERE u.active = true
      `, 'utf8');

      runQueryOptionalAdd(sqlPath, { filter: 'status' });

      const rewrittenSql = readFileSync(sqlPath, 'utf8');
      expect(rewrittenSql).toContain('FROM users u');
      expect(rewrittenSql).not.toContain('FROM users as u');
      expect(rewrittenSql).toContain('and (:status is null or u.status = :status)');
    } finally {
      rmSync(rootDir, { recursive: true, force: true });
    }
  });

  test('rejects unsupported optional condition branch kind', () => {
    const rootDir = mkdtempSync(path.join(tmpdir(), 'ashiba-query-optional-kind-'));

    try {
      const sqlPath = path.join(rootDir, 'users.sql');
      writeFileSync(sqlPath, 'select id from users where active = true;', 'utf8');

      expect(catchError(() => runQueryOptionalAdd(sqlPath, { filter: 'status', kind: 'foo' }))).toMatchObject({
        code: 'ASHIBA_QUERY_OPTIONAL_BRANCH_KIND_UNSUPPORTED',
      });
    } finally {
      rmSync(rootDir, { recursive: true, force: true });
    }
  });
});

function catchError(callback: () => unknown): unknown {
  try {
    callback();
    return undefined;
  } catch (error) {
    return error;
  }
}

function findRegisteredCommand(program: ReturnType<typeof buildProgram>, name: string) {
  const parts = name.split(' ');
  let current = program;
  for (const part of parts) {
    const next = current.commands.find((command) => command.name() === part);
    if (!next) {
      return undefined;
    }
    current = next;
  }
  return current;
}

function captureCommandHelp(command: NonNullable<ReturnType<typeof findRegisteredCommand>>): string {
  let output = '';
  command.configureOutput({
    writeOut: (text) => {
      output += text;
    },
    writeErr: (text) => {
      output += text;
    },
  });
  command.outputHelp();
  return output;
}

function writePostgresStarterPackageJson(rootDir: string): void {
  writeFileSync(path.join(rootDir, 'package.json'), `${JSON.stringify({
    name: 'starter',
    private: true,
    type: 'module',
    dependencies: {
      '@ashiba-ts/driver-adapter-core': '^0.0.0',
      '@ashiba-ts/driver-adapter-pg': '^0.0.0',
      pg: '^8.0.0',
    },
    devDependencies: {
      '@ashiba-ts/cli': '^0.0.0',
      '@ashiba-ts/testkit-adapter-pg': '^0.0.0',
      '@types/pg': '^8.0.0',
      dotenv: '^16.0.0',
      typescript: '^5.0.0',
      vitest: '^4.0.0',
    },
  }, null, 2)}\n`);
}
