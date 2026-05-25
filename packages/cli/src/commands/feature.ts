import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import type { Command } from 'commander';
import { compileNamedParameters } from '../parameter-metadata.js';
import { CreateTableQuery, MultiQuerySplitter, RawString, SqlFormatter, SqlParser, TypeValue, type ValueComponent } from 'rawsql-ts';
import { extractSqlResultColumns } from './sql-result-columns.js';
import { astParseUserError, invalidCliInputError, requiredCliValueError } from '../errors.js';

const FEATURE_ACTIONS = ['insert', 'update', 'delete', 'get-by-id', 'list'] as const;
type FeatureAction = (typeof FEATURE_ACTIONS)[number];
const sqlFormatter = new SqlFormatter({ keywordCase: 'lower' });

export interface FeatureScaffoldOptions {
  table?: string;
  action?: string;
  featureName?: string;
  rootDir?: string;
  dryRun?: boolean;
  force?: boolean;
}

export interface FeatureQueryScaffoldOptions {
  table?: string;
  action?: string;
  queryName?: string;
  feature?: string;
  boundaryDir?: string;
  rootDir?: string;
  workingDir?: string;
  dryRun?: boolean;
  force?: boolean;
}

export interface FeatureTestsScaffoldOptions {
  feature?: string;
  query?: string;
  rootDir?: string;
  dryRun?: boolean;
  force?: boolean;
}

export interface FeatureGeneratedMapperCheckOptions {
  feature?: string;
  query?: string;
  rootDir?: string;
  format?: 'text' | 'json';
}

export interface FeatureScaffoldResult {
  featureName: string;
  queryName: string;
  action: FeatureAction;
  table: string;
  primaryKeyColumn: string;
  dryRun: boolean;
  outputs: Array<{ path: string; written: boolean; kind: 'directory' | 'file' }>;
}

export interface FeatureGeneratedMapperCheckResult {
  rootDir: string;
  checked: Array<{
    feature: string;
    query: string;
    sqlFile: string;
    boundaryFile: string;
    sqlParameters: string[];
    mapperParameters: string[];
    sqlResultColumns: string[];
    mapperResultColumns: string[];
    missingInMapper: string[];
    unusedInMapper: string[];
    missingResultInMapper: string[];
    unusedResultInMapper: string[];
  }>;
  ok: boolean;
}

interface DdlColumn {
  name: string;
  typeName: string;
  nullable: boolean;
  defaultValue?: string;
  generated: boolean;
  primaryKey: boolean;
}

interface DdlTable {
  schema: string;
  name: string;
  canonicalName: string;
  columns: DdlColumn[];
  primaryKeyColumns: string[];
}

interface GeneratedFile {
  relativePath: string;
  contents?: string;
  kind: 'directory' | 'file';
  overwrite?: boolean;
}

export function registerFeatureCommand(program: Command): void {
  const feature = program.command('feature').description('Scaffold editable feature-local SQL boundaries');
  const query = feature.command('query').description('Add query boundaries to an existing feature');
  const tests = feature.command('tests').description('Scaffold feature-local mapper test files');
  const generatedMapper = feature.command('generated-mapper').description('Check editable generated mapper drift');

  feature
    .command('scaffold')
    .description('Scaffold a feature-local CRUD or SELECT boundary from DDL metadata')
    .requiredOption('--table <table>', 'Target table name')
    .requiredOption('--action <action>', 'Action: insert, update, delete, get-by-id, or list')
    .option('--feature-name <name>', 'Override the derived feature name')
    .option('--root-dir <path>', 'Project root directory', '.')
    .option('--dry-run', 'Print the files that would be created without writing them', false)
    .option('--force', 'Overwrite scaffold-owned files when they already exist', false)
    .action((options: FeatureScaffoldOptions) => {
      process.stdout.write(formatFeatureScaffoldResult('Feature scaffold', runFeatureScaffold(options)));
    });

  query
    .command('scaffold')
    .description('Scaffold one additive query boundary without rewriting parent orchestration')
    .requiredOption('--table <table>', 'Target table name')
    .requiredOption('--action <action>', 'Action: insert, update, delete, get-by-id, or list')
    .requiredOption('--query-name <name>', 'Query boundary name')
    .option('--feature <name>', 'Resolve target as src/features/<feature>')
    .option('--boundary-dir <path>', 'Explicit boundary directory')
    .option('--root-dir <path>', 'Project root directory', '.')
    .option('--dry-run', 'Print the files that would be created without writing them', false)
    .option('--force', 'Overwrite scaffold-owned query files when they already exist', false)
    .action((options: FeatureQueryScaffoldOptions) => {
      process.stdout.write(formatFeatureScaffoldResult('Feature query scaffold', runFeatureQueryScaffold(options)));
    });

  tests
    .command('scaffold')
    .description('Scaffold editable mapper test files and library-owned generated test schema files')
    .requiredOption('--feature <name>', 'Feature name under src/features')
    .option('--query <name>', 'Limit scaffolding to one query boundary')
    .option('--root-dir <path>', 'Project root directory', '.')
    .option('--dry-run', 'Print the files that would be created without writing them', false)
    .option('--force', 'Overwrite scaffold-owned test files when they already exist', false)
    .action((options: FeatureTestsScaffoldOptions) => {
      const result = runFeatureTestsScaffold(options);
      process.stdout.write(formatFilePlan('Feature tests scaffold', result.rootDir, result.dryRun, result.outputs));
    });

  generatedMapper
    .command('check')
    .description('Check SQL named parameters against editable generated query mapper contracts')
    .option('--feature <name>', 'Limit drift check to one feature under src/features')
    .option('--query <name>', 'Limit drift check to one query boundary')
    .option('--root-dir <path>', 'Project root directory', '.')
    .option('--format <format>', 'Output format: text or json', 'text')
    .action((options: FeatureGeneratedMapperCheckOptions) => {
      const result = runFeatureGeneratedMapperCheck(options);
      if (options.format === 'json') {
        process.stdout.write(`${JSON.stringify({ kind: 'feature-generated-mapper-check', ...result }, null, 2)}\n`);
        if (!result.ok) process.exitCode = 1;
        return;
      }
      process.stdout.write(formatGeneratedMapperCheck(result));
      if (!result.ok) process.exitCode = 1;
    });
}

export function runFeatureScaffold(options: FeatureScaffoldOptions): FeatureScaffoldResult {
  const rootDir = path.resolve(options.rootDir ?? '.');
  const action = normalizeFeatureAction(options.action);
  const table = loadDdlTable(rootDir, requireValue(options.table, '--table'));
  const primaryKeyColumn = resolvePrimaryKeyColumn(table);
  const featureName = normalizeFeatureName(options.featureName ?? `${toKebab(table.name)}-${action}`);
  const queryName = deriveQueryName(table.name, action);
  const files = buildFeatureFiles(rootDir, featureName, queryName, action, table, primaryKeyColumn);
  const outputs = writeGeneratedFiles(rootDir, files, options.dryRun === true, options.force === true);

  return {
    featureName,
    queryName,
    action,
    table: table.canonicalName,
    primaryKeyColumn,
    dryRun: options.dryRun === true,
    outputs,
  };
}

export function runFeatureQueryScaffold(options: FeatureQueryScaffoldOptions): FeatureScaffoldResult {
  const rootDir = path.resolve(options.rootDir ?? '.');
  const action = normalizeFeatureAction(options.action);
  const table = loadDdlTable(rootDir, requireValue(options.table, '--table'));
  const primaryKeyColumn = resolvePrimaryKeyColumn(table);
  const queryName = normalizeQueryName(options.queryName);
  const boundaryDir = resolveBoundaryDir(rootDir, options);
  const relativeBoundary = toProjectPath(rootDir, boundaryDir);

  if (!existsSync(path.join(boundaryDir, 'boundary.ts'))) {
    throw invalidCliInputError(
      'ASHIBA_FEATURE_BOUNDARY_FILE_MISSING',
      `Boundary directory must contain boundary.ts: ${relativeBoundary}.`,
      'Run feature scaffold first, or pass --boundary-dir/--feature for an existing feature boundary.',
      { boundaryDir: relativeBoundary },
    );
  }

  const files = buildQueryFiles(rootDir, relativeBoundary, queryName, action, table, primaryKeyColumn);
  const outputs = writeGeneratedFiles(rootDir, files, options.dryRun === true, options.force === true);
  const featureName = path.basename(boundaryDir);

  return {
    featureName,
    queryName,
    action,
    table: table.canonicalName,
    primaryKeyColumn,
    dryRun: options.dryRun === true,
    outputs,
  };
}

export function runFeatureTestsScaffold(options: FeatureTestsScaffoldOptions): {
  rootDir: string;
  dryRun: boolean;
  outputs: Array<{ path: string; written: boolean; kind: 'directory' | 'file' }>;
} {
  const rootDir = path.resolve(options.rootDir ?? '.');
  const featureName = normalizeFeatureName(requireValue(options.feature, '--feature'));
  const featureDir = path.join(rootDir, 'src', 'features', featureName);
  const queriesDir = path.join(featureDir, 'queries');
  if (!existsSync(queriesDir) || !statSync(queriesDir).isDirectory()) {
    throw invalidCliInputError(
      'ASHIBA_FEATURE_QUERIES_DIR_MISSING',
      `No queries directory was discovered under src/features/${featureName}. Run feature scaffold first.`,
      'Run feature scaffold or feature query scaffold before creating query tests.',
      { featureName },
    );
  }

  const queryNames = options.query ? [normalizeQueryName(options.query)] : readdirSync(queriesDir).filter((entry) => {
    const fullPath = path.join(queriesDir, entry);
    return statSync(fullPath).isDirectory();
  });

  const files: GeneratedFile[] = [
    {
      relativePath: `src/features/${featureName}/tests/${featureName}.boundary.test.ts`,
      kind: 'file',
      contents: renderFeatureBoundaryTest(featureName),
      overwrite: false,
    },
  ];

  for (const queryName of queryNames) {
    const queryDir = path.join(queriesDir, queryName);
    if (!existsSync(queryDir)) {
      throw invalidCliInputError(
        'ASHIBA_FEATURE_QUERY_DIR_MISSING',
        `Query directory not found for tests scaffold: ${queryName}.`,
        'Check --query or run feature query scaffold for this query before creating tests.',
        { featureName, queryName },
      );
    }
    files.push(
      { relativePath: `src/features/${featureName}/queries/${queryName}/tests`, kind: 'directory' },
      { relativePath: `src/features/${featureName}/queries/${queryName}/tests/cases`, kind: 'directory' },
      {
        relativePath: `src/features/${featureName}/queries/${queryName}/tests/${queryName}.boundary.ztd.test.ts`,
        kind: 'file',
        contents: renderQueryZtdTest(featureName, queryName),
        overwrite: false,
      },
      {
        relativePath: `src/features/${featureName}/queries/${queryName}/tests/cases/basic.case.ts`,
        kind: 'file',
        contents: renderEmptyQueryZtdCases(),
        overwrite: false,
      },
      { relativePath: `src/features/${featureName}/queries/${queryName}/tests/cases/.gitkeep`, kind: 'file', contents: '', overwrite: false },
      {
        relativePath: `src/features/${featureName}/queries/${queryName}/tests/generated/TEST_PLAN.md`,
        kind: 'file',
        contents: renderGeneratedTestPlan(featureName, queryName),
        overwrite: true,
      },
      {
        relativePath: `src/features/${featureName}/queries/${queryName}/tests/generated/analysis.json`,
        kind: 'file',
        contents: `${JSON.stringify({ feature: featureName, query: queryName, status: 'generated-empty-cases' }, null, 2)}\n`,
        overwrite: true,
      }
    );
  }

  const outputs = writeGeneratedFiles(rootDir, files, options.dryRun === true, options.force === true);
  return { rootDir, dryRun: options.dryRun === true, outputs };
}

export function runFeatureGeneratedMapperCheck(options: FeatureGeneratedMapperCheckOptions = {}): FeatureGeneratedMapperCheckResult {
  const rootDir = path.resolve(options.rootDir ?? '.');
  const featureNames = discoverFeatureNames(rootDir, options.feature);
  const checked: FeatureGeneratedMapperCheckResult['checked'] = [];

  for (const featureName of featureNames) {
    const queriesDir = path.join(rootDir, 'src', 'features', featureName, 'queries');
    if (!existsSync(queriesDir)) {
      continue;
    }
    const queryNames = discoverQueryNames(queriesDir, options.query);
    for (const queryName of queryNames) {
      const queryDir = path.join(queriesDir, queryName);
      const sqlFile = path.join(queryDir, `${queryName}.sql`);
      const boundaryFile = path.join(queryDir, 'boundary.ts');
      if (!existsSync(sqlFile) || !existsSync(boundaryFile)) {
        continue;
      }
      const sqlParameters = [...new Set(compileNamedParameters(readFileSync(sqlFile, 'utf8')).orderedNames)].sort();
      const sql = readFileSync(sqlFile, 'utf8');
      const boundary = readFileSync(boundaryFile, 'utf8');
      const mapperParameters = extractMapperParameters(boundary, queryName).sort();
      const sqlResultColumns = extractSqlResultColumns(sql).sort();
      const mapperResultColumns = extractMapperResultColumns(boundary, queryName).sort();
      const missingInMapper = sqlParameters.filter((parameter) => !mapperParameters.includes(parameter));
      const unusedInMapper = mapperParameters.filter((parameter) => !sqlParameters.includes(parameter));
      const missingResultInMapper = sqlResultColumns.filter((column) => !mapperResultColumns.includes(column));
      const unusedResultInMapper = mapperResultColumns.filter((column) => !sqlResultColumns.includes(column));
      checked.push({
        feature: featureName,
        query: queryName,
        sqlFile: toProjectPath(rootDir, sqlFile),
        boundaryFile: toProjectPath(rootDir, boundaryFile),
        sqlParameters,
        mapperParameters,
        sqlResultColumns,
        mapperResultColumns,
        missingInMapper,
        unusedInMapper,
        missingResultInMapper,
        unusedResultInMapper,
      });
    }
  }

  if (checked.length === 0) {
    throw invalidCliInputError(
      'ASHIBA_FEATURE_QUERY_BOUNDARIES_NOT_FOUND',
      'No feature query boundaries were discovered for generated mapper drift check.',
      'Run feature scaffold/query scaffold first, or pass --feature/--query for an existing feature query boundary.',
      { rootDir },
    );
  }

  return {
    rootDir,
    checked,
    ok: checked.every((entry) =>
      entry.missingInMapper.length === 0
      && entry.unusedInMapper.length === 0
      && entry.missingResultInMapper.length === 0
      && entry.unusedResultInMapper.length === 0
    ),
  };
}

function buildFeatureFiles(
  rootDir: string,
  featureName: string,
  queryName: string,
  action: FeatureAction,
  table: DdlTable,
  primaryKeyColumn: string
): GeneratedFile[] {
  const boundary = `src/features/${featureName}`;
  return [
    ...buildSharedFiles(),
    { relativePath: boundary, kind: 'directory' },
    { relativePath: `${boundary}/queries/${queryName}`, kind: 'directory' },
    { relativePath: `${boundary}/tests`, kind: 'directory' },
    {
      relativePath: `${boundary}/README.md`,
      kind: 'file',
      contents: renderFeatureReadme(featureName, queryName, action, table, primaryKeyColumn),
    },
    {
      relativePath: `${boundary}/boundary.ts`,
      kind: 'file',
      contents: renderFeatureBoundary(featureName, queryName),
    },
    {
      relativePath: `${boundary}/tests/${featureName}.boundary.test.ts`,
      kind: 'file',
      contents: renderFeatureBoundaryTest(featureName),
    },
    ...buildQueryFiles(rootDir, boundary, queryName, action, table, primaryKeyColumn),
  ];
}

function discoverFeatureNames(rootDir: string, featureName?: string): string[] {
  const featuresDir = path.join(rootDir, 'src', 'features');
  if (featureName) {
    return [normalizeFeatureName(featureName)];
  }
  if (!existsSync(featuresDir)) {
    throw invalidCliInputError(
      'ASHIBA_FEATURES_DIR_MISSING',
      'No src/features directory was discovered.',
      'Run ashiba feature scaffold first, or pass --feature for an existing feature directory.',
      { featuresDir: toProjectPath(rootDir, featuresDir) },
    );
  }
  return readdirSync(featuresDir)
    .filter((entry) => !entry.startsWith('_'))
    .filter((entry) => statSync(path.join(featuresDir, entry)).isDirectory())
    .sort();
}

function discoverQueryNames(queriesDir: string, queryName?: string): string[] {
  if (queryName) {
    return [normalizeQueryName(queryName)];
  }
  return readdirSync(queriesDir)
    .filter((entry) => statSync(path.join(queriesDir, entry)).isDirectory())
    .sort();
}

function extractMapperParameters(source: string, queryName: string): string[] {
  const pascal = toPascal(queryName);
  const preferred = extractInterfaceFields(source, `${pascal}QueryParams`);
  if (preferred.length > 0 || source.includes(`interface ${pascal}QueryParams`)) {
    return preferred;
  }

  const matches = [...source.matchAll(/export\s+interface\s+([A-Za-z0-9_]+QueryParams)\s*\{([\s\S]*?)\}/g)];
  if (matches.length === 1) {
    return extractFieldNames(matches[0][2] ?? '');
  }
  return [];
}

function extractMapperResultColumns(source: string, queryName: string): string[] {
  const pascal = toPascal(queryName);
  const preferred = extractInterfaceFields(source, `${pascal}QueryResult`);
  if (preferred.length > 0 || source.includes(`interface ${pascal}QueryResult`)) {
    return preferred;
  }

  const matches = [...source.matchAll(/export\s+interface\s+([A-Za-z0-9_]+QueryResult)\s*\{([\s\S]*?)\}/g)];
  if (matches.length === 1) {
    return extractFieldNames(matches[0][2] ?? '');
  }
  return [];
}

function extractInterfaceFields(source: string, interfaceName: string): string[] {
  const escapedName = interfaceName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = source.match(new RegExp(`export\\s+interface\\s+${escapedName}\\s*\\{([\\s\\S]*?)\\}`));
  return match ? extractFieldNames(match[1] ?? '') : [];
}

function extractFieldNames(body: string): string[] {
  return body
    .split(/\r?\n/)
    .map((line) => line.replace(/\/\/.*$/, '').trim())
    .map((line) => line.match(/^([A-Za-z_][A-Za-z0-9_]*)\??\s*:/)?.[1])
    .filter((field): field is string => Boolean(field))
    .sort();
}

function formatGeneratedMapperCheck(result: FeatureGeneratedMapperCheckResult): string {
  const lines = [`Feature generated mapper check: ${result.ok ? 'ok' : 'failed'}`];
  for (const entry of result.checked) {
    lines.push('', `- ${entry.feature}/${entry.query}`);
    lines.push(`  sql: ${entry.sqlFile}`);
    lines.push(`  mapper: ${entry.boundaryFile}`);
    lines.push(`  sql parameters: ${entry.sqlParameters.length > 0 ? entry.sqlParameters.join(', ') : '(none)'}`);
    lines.push(`  mapper parameters: ${entry.mapperParameters.length > 0 ? entry.mapperParameters.join(', ') : '(none)'}`);
    lines.push(`  sql result columns: ${entry.sqlResultColumns.length > 0 ? entry.sqlResultColumns.join(', ') : '(none)'}`);
    lines.push(`  mapper result columns: ${entry.mapperResultColumns.length > 0 ? entry.mapperResultColumns.join(', ') : '(none)'}`);
    if (entry.missingInMapper.length > 0) {
      lines.push(`  missing in mapper: ${entry.missingInMapper.join(', ')}`);
    }
    if (entry.unusedInMapper.length > 0) {
      lines.push(`  unused in mapper: ${entry.unusedInMapper.join(', ')}`);
    }
    if (entry.missingResultInMapper.length > 0) {
      lines.push(`  missing result in mapper: ${entry.missingResultInMapper.join(', ')}`);
    }
    if (entry.unusedResultInMapper.length > 0) {
      lines.push(`  unused result in mapper: ${entry.unusedResultInMapper.join(', ')}`);
    }
  }
  return `${lines.join('\n')}\n`;
}

function buildQueryFiles(
  rootDir: string,
  boundary: string,
  queryName: string,
  action: FeatureAction,
  table: DdlTable,
  primaryKeyColumn: string
): GeneratedFile[] {
  const queryDir = `${boundary}/queries/${queryName}`;
  const queryAbsoluteDir = path.join(rootDir, queryDir);
  const actionPlan = buildActionPlan(action, table, primaryKeyColumn);
  return [
    ...buildSharedFiles(),
    { relativePath: queryDir, kind: 'directory' },
    {
      relativePath: `${queryDir}/${queryName}.sql`,
      kind: 'file',
      contents: renderActionSql(actionPlan, table, primaryKeyColumn),
    },
    {
      relativePath: `${queryDir}/boundary.ts`,
      kind: 'file',
      contents: renderQueryBoundary(queryAbsoluteDir, queryName, actionPlan),
    },
    { relativePath: `${queryDir}/tests`, kind: 'directory' },
    { relativePath: `${queryDir}/tests/cases`, kind: 'directory' },
    {
      relativePath: `${queryDir}/tests/${queryName}.boundary.ztd.test.ts`,
      kind: 'file',
      contents: renderQueryZtdTest(featureNameFromBoundary(boundary), queryName),
      overwrite: false,
    },
    {
      relativePath: `${queryDir}/tests/boundary-ztd-types.ts`,
      kind: 'file',
      contents: renderQueryZtdTypes(queryName, table, actionPlan),
      overwrite: false,
    },
    {
      relativePath: `${queryDir}/tests/cases/basic.case.ts`,
      kind: 'file',
      contents: renderQueryZtdCases(queryName, actionPlan, table, primaryKeyColumn),
      overwrite: false,
    },
    { relativePath: `${queryDir}/tests/cases/.gitkeep`, kind: 'file', contents: '', overwrite: false },
    {
      relativePath: `${queryDir}/tests/generated/TEST_PLAN.md`,
      kind: 'file',
      contents: renderGeneratedTestPlan(featureNameFromBoundary(boundary), queryName),
      overwrite: true,
    },
    {
      relativePath: `${queryDir}/tests/generated/analysis.json`,
      kind: 'file',
      contents: `${JSON.stringify({
        feature: featureNameFromBoundary(boundary),
        query: queryName,
        action,
        table: table.canonicalName,
        status: 'generated',
      }, null, 2)}\n`,
      overwrite: true,
    },
  ];
}

function buildSharedFiles(): GeneratedFile[] {
  return [
    { relativePath: 'src/features/_shared', kind: 'directory' },
    {
      relativePath: 'src/features/_shared/featureQueryExecutor.ts',
      kind: 'file',
      overwrite: false,
      contents: [
        'export interface FeatureQuerySource {',
        '  id: string;',
        '  path: string;',
        '  sql: string;',
        '}',
        '',
        'export interface FeatureQueryExecutor {',
        '  query<T = unknown>(query: FeatureQuerySource, params: Record<string, unknown>): Promise<T[]>;',
        '}',
        '',
      ].join('\n'),
    },
    {
      relativePath: 'src/features/_shared/loadSqlResource.ts',
      kind: 'file',
      overwrite: false,
      contents: [
        "import { readFileSync } from 'node:fs';",
        "import path from 'node:path';",
        '',
        'export function loadSqlResource(currentDir: string, relativePath: string): string {',
        "  return readFileSync(path.join(currentDir, relativePath), 'utf8');",
        '}',
        '',
      ].join('\n'),
    },
  ];
}

function writeGeneratedFiles(
  rootDir: string,
  files: GeneratedFile[],
  dryRun: boolean,
  force: boolean
): FeatureScaffoldResult['outputs'] {
  const outputs: FeatureScaffoldResult['outputs'] = [];
  const seen = new Set<string>();

  for (const file of files) {
    if (seen.has(file.relativePath)) {
      continue;
    }
    seen.add(file.relativePath);
    const destination = path.join(rootDir, file.relativePath);
    const exists = existsSync(destination);
    const mayOverwrite = force || file.overwrite === true;
    if (file.kind === 'file' && exists && !mayOverwrite && file.overwrite !== false) {
      throw invalidCliInputError(
        'ASHIBA_SCAFFOLD_OVERWRITE_REQUIRES_FORCE',
        `Refusing to overwrite scaffold-owned file without --force: ${file.relativePath}`,
        'Review the existing file and rerun with --force only when overwriting scaffold-owned output is intentional.',
        { file: file.relativePath },
      );
    }
    if (!dryRun) {
      if (file.kind === 'directory') {
        mkdirSync(destination, { recursive: true });
      } else if (!exists || mayOverwrite || file.overwrite !== false) {
        mkdirSync(path.dirname(destination), { recursive: true });
        writeFileSync(destination, file.contents ?? '', 'utf8');
      }
    }
    outputs.push({ path: file.relativePath, written: !dryRun, kind: file.kind });
  }

  return outputs;
}

function loadDdlTable(rootDir: string, rawTableName: string): DdlTable {
  const ddlDir = resolveDdlDir(rootDir);
  const files = collectSqlFiles(ddlDir);
  const tables = files.flatMap((file) => parseDdlTables(readFileSync(file, 'utf8')));
  const requested = rawTableName.trim().toLowerCase();
  const matches = tables.filter((table) =>
    table.canonicalName.toLowerCase() === requested || table.name.toLowerCase() === requested
  );
  if (matches.length === 0) {
    throw invalidCliInputError(
      'ASHIBA_FEATURE_TABLE_NOT_FOUND',
      `Table not found for scaffold: ${rawTableName}.`,
      'Check --table and the configured DDL directory, then rerun the scaffold command.',
      { table: rawTableName },
    );
  }
  if (matches.length > 1 && !requested.includes('.')) {
    throw invalidCliInputError(
      'ASHIBA_FEATURE_TABLE_AMBIGUOUS',
      `Table name is ambiguous: ${rawTableName}. Use a schema-qualified table name.`,
      'Pass --table as schema.table so Ashiba can choose the intended DDL table.',
      { table: rawTableName, matches: matches.map((table) => table.canonicalName) },
    );
  }
  return matches[0];
}

function resolveDdlDir(rootDir: string): string {
  const configPath = path.join(rootDir, 'ashiba.config.json');
  if (existsSync(configPath)) {
    try {
      const parsed = JSON.parse(readFileSync(configPath, 'utf8')) as { ddl?: { sourceDir?: unknown }; ddlDir?: unknown };
      if (typeof parsed.ddl?.sourceDir === 'string') {
        return path.resolve(rootDir, parsed.ddl.sourceDir);
      }
      if (typeof parsed.ddlDir === 'string') {
        return path.resolve(rootDir, parsed.ddlDir);
      }
    } catch (error) {
      throw invalidCliInputError(
        'ASHIBA_CONFIG_JSON_PARSE_FAILED',
        'Failed to parse ashiba.config.json.',
        'Fix ashiba.config.json so it is valid JSON, or remove it to use the default db/ddl directory.',
        { configPath, reason: error instanceof Error ? error.message : String(error) },
      );
    }
  }
  return path.join(rootDir, 'db', 'ddl');
}

function collectSqlFiles(dir: string): string[] {
  if (!existsSync(dir)) {
    throw invalidCliInputError(
      'ASHIBA_DDL_DIRECTORY_NOT_FOUND',
      `DDL directory does not exist: ${dir}.`,
      'Create the configured DDL directory, pass the correct root/config, or update ashiba.config.json ddl.sourceDir.',
      { dir },
    );
  }
  const found: string[] = [];
  for (const entry of readdirSync(dir)) {
    const fullPath = path.join(dir, entry);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      found.push(...collectSqlFiles(fullPath));
    } else if (stat.isFile() && entry.toLowerCase().endsWith('.sql')) {
      found.push(fullPath);
    }
  }
  return found.sort();
}

function parseDdlTables(sql: string): DdlTable[] {
  return MultiQuerySplitter.split(sql).getNonEmpty().flatMap((statement) => {
    try {
      const parsed = SqlParser.parse(statement.sql);
      return parsed instanceof CreateTableQuery ? [createDdlTable(parsed)] : [];
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      throw astParseUserError({
        code: 'ASHIBA_FEATURE_DDL_AST_PARSE_FAILED',
        message: 'DDL AST parse failed while reading feature scaffold table metadata.',
        reason,
        sqlKind: 'DDL',
        operation: 'reading feature scaffold table metadata',
      });
    }
  });
}

function createDdlTable(parsed: CreateTableQuery): DdlTable {
  const schema = normalizeIdentifier(parsed.namespaces?.[0] ?? 'public');
  const name = normalizeIdentifier(parsed.tableName.name);
  const tablePrimaryKeys = parsed.tableConstraints
    .filter((constraint) => constraint.kind === 'primary-key')
    .flatMap((constraint) => constraint.columns ?? [])
    .map((value) => normalizeIdentifier(value.name));
  const tablePrimaryKeySet = new Set(tablePrimaryKeys.map((value) => value.toLowerCase()));
  const columns: DdlColumn[] = [];
  for (const column of parsed.columns) {
    const columnName = normalizeIdentifier(column.name.name);
    const primaryKey = tablePrimaryKeySet.has(columnName.toLowerCase())
      || column.constraints.some((constraint) => constraint.kind === 'primary-key');
    const generated = column.constraints.some((constraint) =>
      constraint.kind === 'generated-always-identity' || constraint.kind === 'generated-by-default-identity'
    );
    const defaultValue = column.constraints.find((constraint) => constraint.kind === 'default')?.defaultValue;
    columns.push({
      name: columnName,
      typeName: getColumnTypeName(column.dataType),
      nullable: !primaryKey && !column.constraints.some((constraint) => constraint.kind === 'not-null'),
      defaultValue: defaultValue ? formatValue(defaultValue) : undefined,
      generated,
      primaryKey,
    });
  }
  const primaryKeyColumns = [...new Set([...columns.filter((column) => column.primaryKey).map((column) => column.name), ...tablePrimaryKeys])];
  return { schema, name, canonicalName: `${schema}.${name}`, columns, primaryKeyColumns };
}

function getColumnTypeName(dataType: CreateTableQuery['columns'][number]['dataType']): string {
  if (dataType instanceof TypeValue) return dataType.getTypeName();
  if (dataType instanceof RawString) return dataType.value.trim();
  return 'unknown';
}

function formatValue(value: ValueComponent): string {
  return sqlFormatter.format(value).formattedSql.replace(/"([A-Za-z_][A-Za-z0-9_$]*)"/g, '$1');
}

function buildActionPlan(action: FeatureAction, table: DdlTable, primaryKeyColumn: string): {
  action: FeatureAction;
  params: DdlColumn[];
  rows: DdlColumn[];
  writeColumns: DdlColumn[];
} {
  const primaryKey = requireColumn(table, primaryKeyColumn);
  if (action === 'insert') {
    const writeColumns = table.columns.filter((column) => !isGeneratedInsertColumn(column, primaryKeyColumn) && column.defaultValue == null);
    return { action, params: writeColumns, rows: [primaryKey], writeColumns };
  }
  if (action === 'update') {
    const writeColumns = table.columns.filter((column) => column.name !== primaryKeyColumn && !isGeneratedInsertColumn(column, primaryKeyColumn));
    if (writeColumns.length === 0) {
      throw invalidCliInputError(
        'ASHIBA_FEATURE_UPDATE_REQUIRES_MUTABLE_COLUMN',
        `Update scaffold requires at least one mutable non-primary-key column: ${table.canonicalName}.`,
        'Add a mutable non-primary-key column to the DDL table or choose a different scaffold action.',
        { table: table.canonicalName },
      );
    }
    return { action, params: [primaryKey, ...writeColumns], rows: [primaryKey], writeColumns };
  }
  if (action === 'delete') {
    return { action, params: [primaryKey], rows: [primaryKey], writeColumns: [] };
  }
  if (action === 'get-by-id') {
    return { action, params: [primaryKey], rows: table.columns, writeColumns: [] };
  }
  const limitColumn: DdlColumn = {
    name: 'limit',
    typeName: 'integer',
    nullable: false,
    generated: false,
    primaryKey: false,
  };
  return { action, params: [limitColumn], rows: table.columns, writeColumns: [] };
}

function renderActionSql(plan: ReturnType<typeof buildActionPlan>, table: DdlTable, primaryKeyColumn: string): string {
  const tableName = quoteQualifiedName(table.canonicalName);
  const pk = quoteIdentifier(primaryKeyColumn);
  if (plan.action === 'insert') {
    if (plan.writeColumns.length === 0) {
      return `insert into ${tableName}\ndefault values\nreturning ${pk};\n`;
    }
    return [
      `insert into ${tableName} (`,
      plan.writeColumns.map((column) => `  ${quoteIdentifier(column.name)}`).join(',\n'),
      ') values (',
      plan.writeColumns.map((column) => `  :${column.name}`).join(',\n'),
      `) returning ${pk};`,
      '',
    ].join('\n');
  }
  if (plan.action === 'update') {
    return [
      `update ${tableName}`,
      'set',
      plan.writeColumns.map((column) => `  ${quoteIdentifier(column.name)} = :${column.name}`).join(',\n'),
      'where',
      `  ${pk} = :${primaryKeyColumn}`,
      `returning ${pk};`,
      '',
    ].join('\n');
  }
  if (plan.action === 'delete') {
    return [`delete from ${tableName}`, 'where', `  ${pk} = :${primaryKeyColumn}`, `returning ${pk};`, ''].join('\n');
  }
  if (plan.action === 'get-by-id') {
    return [
      'select',
      table.columns.map((column) => `  ${quoteIdentifier(column.name)}`).join(',\n'),
      `from ${tableName}`,
      'where',
      `  ${pk} = :${primaryKeyColumn};`,
      '',
    ].join('\n');
  }
  return [
    'select',
    table.columns.map((column) => `  ${quoteIdentifier(column.name)}`).join(',\n'),
    `from ${tableName}`,
    'order by',
    `  ${pk} asc`,
    'limit :limit;',
    '',
  ].join('\n');
}

function renderFeatureBoundary(featureName: string, queryName: string): string {
  return [
    `export { execute${toPascal(queryName)}Query, ${toCamel(queryName)}Query, ${toCamel(queryName)}Sql } from './queries/${queryName}/boundary.js';`,
    '',
    '// This file is application-owned after scaffolding.',
    `// Keep ${featureName} orchestration, transactions, and response shaping explicit here.`,
    '',
  ].join('\n');
}

function renderQueryBoundary(
  queryAbsoluteDir: string,
  queryName: string,
  plan: ReturnType<typeof buildActionPlan>
): string {
  const featuresDir = path.dirname(path.dirname(path.dirname(queryAbsoluteDir)));
  const sharedExecutorImport = relativeImport(queryAbsoluteDir, path.join(featuresDir, '_shared', 'featureQueryExecutor.js'));
  const sharedLoaderImport = relativeImport(queryAbsoluteDir, path.join(featuresDir, '_shared', 'loadSqlResource.js'));
  const pascal = toPascal(queryName);
  const camel = toCamel(queryName);
  const result = plan.action === 'list' ? `${pascal}QueryResult[]` : `${pascal}QueryResult`;
  const rowExpr = plan.action === 'list' ? 'rows as QueryRow[]' : '(rows[0] ?? null) as QueryRow | null';
  const returnExpr = plan.action === 'list'
    ? 'return row;'
    : [
        'if (row === null) {',
        `    throw new Error('${queryName} query expected one row, but got 0.');`,
        '  }',
        '  return row;',
      ].join('\n  ');
  return [
    "import { dirname } from 'node:path';",
    "import { fileURLToPath } from 'node:url';",
    '',
    `import type { FeatureQueryExecutor } from '${sharedExecutorImport}';`,
    `import { loadSqlResource } from '${sharedLoaderImport}';`,
    '',
    'const currentDir = dirname(fileURLToPath(import.meta.url));',
    `export const ${camel}Sql = loadSqlResource(currentDir, '${queryName}.sql');`,
    `export const ${camel}Query = {`,
    `  id: '${queryName}',`,
    `  path: '${queryName}.sql',`,
    `  sql: ${camel}Sql,`,
    '} as const;',
    '',
    `export interface ${pascal}QueryParams ${renderInterfaceBody(plan.params)}`,
    '',
    `export interface ${pascal}QueryResult ${renderInterfaceBody(plan.rows)}`,
    '',
    `type QueryRow = ${pascal}QueryResult;`,
    '',
    `export async function execute${pascal}Query(`,
    '  executor: FeatureQueryExecutor,',
    `  params: ${pascal}QueryParams`,
    `): Promise<${result}> {`,
    `  const rows = await executor.query<QueryRow>(${camel}Query, params as unknown as Record<string, unknown>);`,
    `  const row = ${rowExpr};`,
    `  ${returnExpr}`,
    '}',
    '',
  ].join('\n');
}

function renderInterfaceBody(columns: DdlColumn[]): string {
  if (columns.length === 0) {
    return '{ [key: string]: never; }';
  }
  return `{\n${columns.map((column) => `  ${column.name}: ${toTsType(column)};`).join('\n')}\n}`;
}

function renderFeatureBoundaryTest(featureName: string): string {
  return [
    "import { expect, test } from 'vitest';",
    '',
    "import * as boundary from '../boundary.js';",
    '',
    `test('${featureName} boundary exports executable query entry points', () => {`,
    '  expect(Object.keys(boundary).length).toBeGreaterThan(0);',
    '});',
    '',
  ].join('\n');
}

function renderQueryZtdTest(featureName: string, queryName: string): string {
  const pascal = toPascal(queryName);
  return [
    "import { existsSync } from 'node:fs';",
    "import { resolve } from 'node:path';",
    "import { expect, test } from 'vitest';",
    '',
    "import { runQuerySpecZtdCases } from '../../../../../../tests/support/ztd/harness.js';",
    `import { execute${pascal}Query } from '../boundary.js';`,
    "import cases from './cases/basic.case.js';",
    '',
    'const shouldSkipZtd =',
    "  process.env.ASHIBA_SKIP_DB_BACKED_TESTS === '1' ||",
    "  !existsSync(resolve('db/ddl/public.sql')) ||",
    '  cases.length === 0;',
    '',
    'const testZtd = shouldSkipZtd ? test.skip : test;',
    '',
    `testZtd('${featureName}/${queryName} boundary ZTD cases run through the fixed app-level harness', async () => {`,
    '  expect(cases.length).toBeGreaterThan(0);',
    `  const evidence = await runQuerySpecZtdCases(cases, execute${pascal}Query);`,
    "  expect(evidence.every((entry) => entry.mode === 'ztd')).toBe(true);",
    '  expect(evidence.every((entry) => entry.physicalSetupUsed === false)).toBe(true);',
    '  expect(evidence.every((entry) => entry.executedQueryCount > 0)).toBe(true);',
    '});',
    '',
  ].join('\n');
}

function renderQueryZtdTypes(
  queryName: string,
  table: DdlTable,
  actionPlan: ReturnType<typeof buildActionPlan>
): string {
  const pascal = toPascal(queryName);
  const outputType = actionPlan.action === 'list' ? `${pascal}QueryResult[]` : `${pascal}QueryResult`;
  return [
    "import type { QuerySpecZtdCase } from '../../../../../../tests/support/ztd/case-types.js';",
    `import type { ${pascal}QueryParams, ${pascal}QueryResult } from '../boundary.js';`,
    '',
    `export type ${pascal}BeforeDb = {`,
    `  ${renderPropertyKey(table.schema)}: {`,
    `    ${renderPropertyKey(table.name)}: readonly {`,
    ...table.columns.map((column) => `      ${renderPropertyKey(column.name)}?: unknown;`),
    '    }[];',
    '  };',
    '};',
    '',
    `export type ${pascal}QueryBoundaryZtdCase = QuerySpecZtdCase<`,
    `  ${pascal}BeforeDb,`,
    `  ${pascal}QueryParams,`,
    `  ${outputType}`,
    '>;',
    '',
  ].join('\n');
}

function renderQueryZtdCases(
  queryName: string,
  actionPlan: ReturnType<typeof buildActionPlan>,
  table: DdlTable,
  primaryKeyColumn: string
): string {
  const pascal = toPascal(queryName);
  const caseType = `${pascal}QueryBoundaryZtdCase`;
  const cases = buildExecutableZtdCases(queryName, actionPlan, table, primaryKeyColumn);
  return [
    `import type { ${caseType} } from '../boundary-ztd-types.js';`,
    '',
    `const cases: readonly ${caseType}[] = ${renderTsValue(cases)};`,
    '',
    'export default cases;',
    '',
  ].join('\n');
}

function renderEmptyQueryZtdCases(): string {
  return [
    'const cases: readonly never[] = [];',
    '',
    'export default cases;',
    '',
  ].join('\n');
}

function renderGeneratedTestPlan(featureName: string, queryName: string): string {
  return [
    `# ${featureName}/${queryName} Test Plan`,
    '',
    'This generated file is library-owned and may be refreshed by Ashiba.',
    '',
    '- Mapper tests: prefer Zero Table Dependency.',
    '- Performance tests: prefer traditional DB-backed tests.',
    '- Keep human-authored cases under `cases/`.',
    '',
  ].join('\n');
}

function buildExecutableZtdCases(
  queryName: string,
  actionPlan: ReturnType<typeof buildActionPlan>,
  table: DdlTable,
  primaryKeyColumn: string
): unknown[] {
  const firstRow = buildFixtureRow(table, 1);
  const secondRow = buildFixtureRow(table, 2);
  const beforeDb = {
    [table.schema]: {
      [table.name]: [firstRow, secondRow],
    },
  };

  if (actionPlan.action === 'get-by-id') {
    return [{
      name: `selects ${queryName} row by primary key`,
      beforeDb,
      input: { [primaryKeyColumn]: firstRow[primaryKeyColumn] },
      output: pickColumns(firstRow, actionPlan.rows),
    }];
  }

  if (actionPlan.action === 'list') {
    return [{
      name: `lists ${queryName} rows in primary-key order`,
      beforeDb,
      input: Object.fromEntries(actionPlan.params.map((column) => [column.name, sampleParameterValue(column)])),
      output: [pickColumns(firstRow, actionPlan.rows), pickColumns(secondRow, actionPlan.rows)],
    }];
  }

  if (actionPlan.action === 'insert') {
    if (!actionPlan.writeColumns.some((column) => column.name === primaryKeyColumn)) {
      return [];
    }
    const insertedRow = buildFixtureRow(table, 3);
    return [{
      name: `inserts ${queryName} row and returns the primary key`,
      beforeDb,
      input: pickColumns(insertedRow, actionPlan.writeColumns),
      output: pickColumns(insertedRow, actionPlan.rows),
    }];
  }

  if (actionPlan.action === 'update') {
    const updatedValues = Object.fromEntries(actionPlan.writeColumns.map((column) => [column.name, sampleColumnValue(column, 3)]));
    return [{
      name: `updates ${queryName} row and returns the primary key`,
      beforeDb,
      input: { [primaryKeyColumn]: firstRow[primaryKeyColumn], ...updatedValues },
      output: pickColumns({ ...firstRow, ...updatedValues }, actionPlan.rows),
    }];
  }

  if (actionPlan.action === 'delete') {
    return [{
      name: `deletes ${queryName} row and returns the primary key`,
      beforeDb,
      input: { [primaryKeyColumn]: firstRow[primaryKeyColumn] },
      output: pickColumns(firstRow, actionPlan.rows),
    }];
  }

  return [];
}

function buildFixtureRow(table: DdlTable, rowNumber: number): Record<string, unknown> {
  return Object.fromEntries(table.columns.map((column) => [column.name, sampleColumnValue(column, rowNumber)]));
}

function pickColumns(row: Record<string, unknown>, columns: DdlColumn[]): Record<string, unknown> {
  return Object.fromEntries(columns.map((column) => [column.name, row[column.name]]));
}

function sampleParameterValue(column: DdlColumn): unknown {
  if (column.name === 'limit') return 100;
  return sampleColumnValue(column, 1);
}

function sampleColumnValue(column: DdlColumn, rowNumber: number): unknown {
  const type = column.typeName.toLowerCase();
  const name = column.name.toLowerCase();
  if (/^(smallint|integer|int|int2|int4|real|float|float4|float8|double precision|serial|serial2|serial4)$/.test(type)) {
    return rowNumber;
  }
  if (/^(bigint|int8|bigserial|serial8|numeric|decimal)$/.test(type)) {
    return String(rowNumber);
  }
  if (/^(boolean|bool)$/.test(type)) {
    return rowNumber % 2 === 1;
  }
  if (name.includes('email')) {
    return rowNumber === 1 ? 'alice@example.com' : 'bob@example.com';
  }
  if (name.includes('name')) {
    return rowNumber === 1 ? 'Alice' : 'Bob';
  }
  if (name.includes('status')) {
    return rowNumber === 1 ? 'active' : 'inactive';
  }
  return `${column.name}-${rowNumber}`;
}

function renderTsValue(value: unknown): string {
  return JSON.stringify(value, null, 2)
    .replace(/\n/g, '\n')
    .replace(/"([^"]+)":/g, (_match, key: string) => `${renderPropertyKey(key)}:`);
}

function renderPropertyKey(value: string): string {
  return /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(value) ? value : JSON.stringify(value);
}

function renderFeatureReadme(featureName: string, queryName: string, action: FeatureAction, table: DdlTable, primaryKeyColumn: string): string {
  return [
    `# ${featureName}`,
    '',
    `Action: ${action}`,
    `Table: ${table.canonicalName}`,
    `Primary key: ${primaryKeyColumn}`,
    `Initial query: ${queryName}`,
    '',
    'Generated code is editable after scaffolding. Keep SQL visible, named, and directly runnable in a SQL client.',
    'Transaction policy and feature orchestration belong to application code, not Ashiba.',
    '',
  ].join('\n');
}

function formatFeatureScaffoldResult(label: string, result: FeatureScaffoldResult): string {
  return formatFilePlan(`${label} ${result.dryRun ? 'plan' : 'completed'}: ${result.featureName}`, process.cwd(), result.dryRun, result.outputs);
}

function formatFilePlan(
  title: string,
  _rootDir: string,
  _dryRun: boolean,
  outputs: Array<{ path: string; written: boolean; kind: 'directory' | 'file' }>
): string {
  return `${[title, '', ...outputs.map((output) => `- ${output.written ? 'write' : 'plan'} ${output.kind}: ${output.path}`)].join('\n')}\n`;
}

function normalizeFeatureAction(action: string | undefined): FeatureAction {
  const normalized = (action ?? '').trim().toLowerCase();
  if (FEATURE_ACTIONS.includes(normalized as FeatureAction)) return normalized as FeatureAction;
  throw invalidCliInputError(
    'ASHIBA_FEATURE_ACTION_UNSUPPORTED',
    `Unsupported --action value: ${action}. v1 supports insert, update, delete, get-by-id, and list.`,
    'Use --action insert, update, delete, get-by-id, or list.',
    { action, supported: FEATURE_ACTIONS },
  );
}

function normalizeFeatureName(value: string): string {
  const normalized = value.trim().toLowerCase();
  if (!/^[a-z][a-z0-9]*(?:-[a-z0-9]+)+$/.test(normalized)) {
    throw invalidCliInputError(
      'ASHIBA_FEATURE_NAME_INVALID',
      'Feature name must use resource-action kebab-case, start with a letter, and look like users-insert.',
      'Rename the feature to resource-action kebab-case, for example users-insert.',
      { value },
    );
  }
  return normalized;
}

function normalizeQueryName(value: string | undefined): string {
  const normalized = (value ?? '').trim().toLowerCase();
  if (!/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/.test(normalized)) {
    throw invalidCliInputError(
      'ASHIBA_QUERY_NAME_INVALID',
      'Query name must use kebab-case, start with a letter, and look like insert-sales-detail.',
      'Pass a kebab-case query name that starts with a letter, for example insert-sales-detail.',
      { value },
    );
  }
  return normalized;
}

function deriveQueryName(tableName: string, action: FeatureAction): string {
  return action === 'get-by-id' || action === 'list' ? action : `${action}-${toKebab(tableName)}`;
}

function resolveBoundaryDir(rootDir: string, options: FeatureQueryScaffoldOptions): string {
  if (options.feature && options.boundaryDir) {
    throw invalidCliInputError(
      'ASHIBA_FEATURE_BOUNDARY_INPUT_CONFLICT',
      'Use either --feature or --boundary-dir, not both.',
      'Choose one boundary selector and rerun the command.',
      { options: ['--feature', '--boundary-dir'] },
    );
  }
  if (options.feature) return path.join(rootDir, 'src', 'features', normalizeFeatureName(options.feature));
  if (options.boundaryDir) return path.resolve(rootDir, options.boundaryDir);
  return options.workingDir ? path.resolve(options.workingDir) : process.cwd();
}

function resolvePrimaryKeyColumn(table: DdlTable): string {
  if (table.primaryKeyColumns.length === 0) {
    throw invalidCliInputError(
      'ASHIBA_FEATURE_PRIMARY_KEY_REQUIRED',
      `Table ${table.canonicalName} must declare exactly one primary key column in v1.`,
      'Add a single-column primary key to the DDL table or scaffold the query manually.',
      { table: table.canonicalName },
    );
  }
  if (table.primaryKeyColumns.length > 1) {
    throw invalidCliInputError(
      'ASHIBA_FEATURE_COMPOSITE_PRIMARY_KEY_UNSUPPORTED',
      `Composite primary keys are not supported in v1: ${table.canonicalName}.`,
      'Scaffold this query manually or adjust the v1 scaffold input to a table with one primary key column.',
      { table: table.canonicalName, primaryKeyColumns: table.primaryKeyColumns },
    );
  }
  return table.primaryKeyColumns[0];
}

function requireColumn(table: DdlTable, name: string): DdlColumn {
  const column = table.columns.find((candidate) => candidate.name === name);
  if (!column) {
    throw invalidCliInputError(
      'ASHIBA_FEATURE_COLUMN_NOT_FOUND',
      `Column ${name} was not found in ${table.canonicalName}.`,
      'Check the DDL table metadata and regenerate or adjust the scaffold input.',
      { table: table.canonicalName, column: name },
    );
  }
  return column;
}

function isGeneratedInsertColumn(column: DdlColumn, primaryKeyColumn: string): boolean {
  if (column.generated) return true;
  if (column.name !== primaryKeyColumn) return false;
  return /^(smallserial|serial|serial2|serial4|bigserial|serial8)$/i.test(column.typeName) || /^nextval\s*\(/i.test(column.defaultValue ?? '');
}

function toTsType(column: DdlColumn): string {
  const type = column.typeName.toLowerCase();
  const base = /^(smallint|integer|int|int2|int4|real|float|float4|float8|double precision|serial|serial2|serial4)$/.test(type)
    ? 'number'
    : /^(bigint|int8|bigserial|serial8|numeric|decimal)$/.test(type)
      ? 'string'
      : /^(boolean|bool)$/.test(type)
        ? 'boolean'
        : 'string';
  return column.nullable ? `${base} | null` : base;
}

function splitQualifiedName(value: string): [string, string] {
  const segments = value.split('.');
  if (segments.length === 1) return ['public', normalizeIdentifier(segments[0])];
  return [normalizeIdentifier(segments[0]), normalizeIdentifier(segments[1])];
}

function normalizeIdentifier(value: string): string {
  return value.trim().replace(/^"/, '').replace(/"$/, '');
}

function quoteQualifiedName(value: string): string {
  return value.split('.').map(quoteIdentifier).join('.');
}

function quoteIdentifier(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

function toKebab(value: string): string {
  return normalizeIdentifier(value)
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/_/g, '-')
    .toLowerCase();
}

function toPascal(value: string): string {
  return toKebab(value).split('-').map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`).join('');
}

function toCamel(value: string): string {
  const pascal = toPascal(value);
  return `${pascal.charAt(0).toLowerCase()}${pascal.slice(1)}`;
}

function featureNameFromBoundary(boundary: string): string {
  return boundary.split('/').filter(Boolean).at(-1) ?? 'feature';
}

function relativeImport(fromDir: string, toFile: string): string {
  const relative = path.relative(fromDir, toFile).replace(/\\/g, '/');
  return relative.startsWith('.') ? relative : `./${relative}`;
}

function toProjectPath(rootDir: string, fullPath: string): string {
  return path.relative(rootDir, fullPath).replace(/\\/g, '/');
}

function requireValue(value: string | undefined, label: string): string {
  if (!value || value.trim().length === 0) throw requiredCliValueError(label);
  return value;
}
