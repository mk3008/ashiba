import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import type { Command } from 'commander';
import { loadProjectPathConfig } from './config.js';

export interface RfbaInspectOptions {
  rootDir?: string;
  format?: 'text' | 'json';
}

export interface RfbaInspectResult {
  rootDir: string;
  attainment: {
    overall: 'done' | 'partial' | 'not done';
    issueCount: number;
    nextActions: string[];
  };
  features: Array<{
    name: string;
    feature: RfbaFileStatus;
    rootSql: RfbaFileStatus;
    boundary: RfbaFileStatus;
    input: RfbaFileStatus;
    workflow: RfbaFileStatus;
    output: RfbaFileStatus;
    standard: {
      status: 'standard' | 'custom';
      warnings: string[];
    };
    queries: Array<{
      name: string;
      query: RfbaFileStatus;
      sql: RfbaFileStatus;
      tests: RfbaFileStatus[];
      issues: string[];
    }>;
    issues: string[];
  }>;
}

export interface RfbaFileStatus {
  path: string;
  exists: boolean;
}

export function registerRfbaCommand(program: Command): void {
  program
    .command('rfba')
    .description('Review-first SQL persistence boundary inspection for Ashiba feature layouts')
    .command('inspect')
    .description('Inspect feature and query boundaries without writing files')
    .option('--root-dir <path>', 'Project root directory', '.')
    .option('--format <format>', 'Output format: text or json', 'text')
    .action((options: RfbaInspectOptions) => {
      const result = runRfbaInspect(options);
      if (options.format === 'json') {
        process.stdout.write(`${JSON.stringify({ kind: 'rfba-inspect', ...result }, null, 2)}\n`);
      } else {
        process.stdout.write(formatRfbaInspect(result));
      }
    });
}

export function runRfbaInspect(options: RfbaInspectOptions = {}): RfbaInspectResult {
  const rootDir = path.resolve(options.rootDir ?? '.');
  const projectConfig = loadProjectPathConfig(rootDir);
  const featuresDir = path.join(rootDir, projectConfig.featureRoot);
  const features = existsSync(featuresDir)
    ? readdirSync(featuresDir)
      .filter((entry) => !entry.startsWith('_'))
      .filter((entry) => statSync(path.join(featuresDir, entry)).isDirectory())
      .map((featureName) => inspectFeature(rootDir, featuresDir, featureName))
    : [];
  return { rootDir, features, attainment: buildRfbaAttainment(features) };
}

function inspectFeature(rootDir: string, featuresDir: string, featureName: string): RfbaInspectResult['features'][number] {
  const featureDir = path.join(featuresDir, featureName);
  const queriesDir = path.join(featureDir, 'queries');
  const feature = fileStatus(rootDir, path.join(featureDir, 'feature.ts'));
  const rootSql = fileStatus(rootDir, path.join(featureDir, 'query.sql'));
  const boundary = fileStatus(rootDir, path.join(featureDir, 'boundary.ts'));
  const input = fileStatus(rootDir, path.join(featureDir, 'input.ts'));
  const workflow = fileStatus(rootDir, path.join(featureDir, 'workflow.ts'));
  const output = fileStatus(rootDir, path.join(featureDir, 'output.ts'));
  const sqlFirst = feature.exists && rootSql.exists;
  const standard = inspectFeatureStandard(rootDir, featureDir, { feature, rootSql, boundary, input, workflow, output }, sqlFirst);
  const rootQuery = sqlFirst ? [inspectRootQuery(rootDir, featureDir, featureName)] : [];
  const nestedQueries = existsSync(queriesDir)
    ? readdirSync(queriesDir)
      .filter((entry) => statSync(path.join(queriesDir, entry)).isDirectory())
      .map((queryName) => inspectQuery(rootDir, queriesDir, queryName))
    : [];
  const queries = [...rootQuery, ...nestedQueries];
  const issues = [
    ...(!feature.exists && !boundary.exists ? [`Feature boundary file is missing: ${feature.path} or ${boundary.path}.`] : []),
    ...(queries.length === 0 ? [`Feature has no query review boundaries: ${featureName}.`] : []),
  ];
  return {
    name: featureName,
    feature,
    rootSql,
    boundary,
    input,
    workflow,
    output,
    standard,
    queries,
    issues,
  };
}

function inspectRootQuery(rootDir: string, featureDir: string, featureName: string): RfbaInspectResult['features'][number]['queries'][number] {
  const analysis = readRootQueryAnalysis(featureDir);
  const queryName = analysis?.query ?? featureName;
  const query = fileStatus(rootDir, path.join(featureDir, 'feature.ts'));
  const sql = fileStatus(rootDir, path.join(featureDir, 'query.sql'));
  const testsDir = path.join(featureDir, 'tests');
  const tests = existsSync(testsDir)
    ? readdirSync(testsDir)
      .filter((entry) => statSync(path.join(testsDir, entry)).isFile())
      .filter((entry) => /\.(?:test|spec)\.[cm]?[jt]sx?$/.test(entry))
      .map((entry) => fileStatus(rootDir, path.join(testsDir, entry)))
    : [];
  const issues = [
    ...(!query.exists ? [`Query file is missing: ${query.path}.`] : []),
    ...(!sql.exists ? [`Visible SQL file is missing: ${sql.path}.`] : []),
  ];
  return { name: queryName, query, sql, tests, issues };
}

function readRootQueryAnalysis(featureDir: string): { query?: string } | undefined {
  const analysisPath = path.join(featureDir, 'tests', 'generated', 'analysis.json');
  if (!existsSync(analysisPath)) return undefined;
  try {
    const parsed = JSON.parse(readFileSync(analysisPath, 'utf8')) as { query?: unknown };
    return typeof parsed.query === 'string' ? { query: parsed.query } : undefined;
  } catch {
    return undefined;
  }
}

function inspectQuery(rootDir: string, queriesDir: string, queryName: string): RfbaInspectResult['features'][number]['queries'][number] {
  const queryDir = path.join(queriesDir, queryName);
  const query = fileStatus(rootDir, path.join(queryDir, 'query.ts'));
  const sql = fileStatus(rootDir, path.join(queryDir, `${queryName}.sql`));
  const testsDir = path.join(queryDir, 'tests');
  const tests = existsSync(testsDir)
    ? readdirSync(testsDir)
      .filter((entry) => statSync(path.join(testsDir, entry)).isFile())
      .filter((entry) => /\.(?:test|spec)\.[cm]?[jt]sx?$/.test(entry))
      .map((entry) => fileStatus(rootDir, path.join(testsDir, entry)))
    : [];
  const issues = [
    ...(!query.exists ? [`Query file is missing: ${query.path}.`] : []),
    ...(!sql.exists ? [`Visible SQL file is missing: ${sql.path}.`] : []),
  ];
  return { name: queryName, query, sql, tests, issues };
}

function buildRfbaAttainment(features: RfbaInspectResult['features']): RfbaInspectResult['attainment'] {
  const issueCount = features.reduce((featureSum, feature) =>
    featureSum + feature.issues.length + feature.queries.reduce((querySum, query) => querySum + query.issues.length, 0),
  0);
  const nextActions = new Set<string>();
  if (features.length === 0) {
    nextActions.add('Scaffold feature/query review boundaries under src/features.');
  }
  for (const feature of features) {
    if (feature.issues.some((issue) => issue.includes('Feature boundary file'))) {
      nextActions.add('Add feature.ts + query.sql for SQL-first review boundaries, or legacy boundary.ts for custom-owned feature shells.');
    }
    if (feature.issues.some((issue) => issue.includes('no query'))) {
      nextActions.add('Add query.sql + DB-backed tests at the feature root, or query-local review boundaries under queries/.');
    }
    for (const query of feature.queries) {
      if (query.issues.some((issue) => issue.includes('Query file'))) {
        nextActions.add('Add query.ts files that expose editable mapper/query contracts.');
      }
      if (query.issues.some((issue) => issue.includes('Visible SQL file'))) {
        nextActions.add('Add visible query SQL files next to query boundaries.');
      }
    }
  }
  return {
    overall: features.length === 0 ? 'not done' : issueCount === 0 ? 'done' : 'partial',
    issueCount,
    nextActions: [...nextActions],
  };
}

function fileStatus(rootDir: string, filePath: string): RfbaFileStatus {
  return {
    path: normalizePath(path.relative(rootDir, filePath)),
    exists: existsSync(filePath),
  };
}

function inspectFeatureStandard(
  rootDir: string,
  featureDir: string,
  files: Pick<RfbaInspectResult['features'][number], 'feature' | 'rootSql' | 'boundary' | 'input' | 'workflow' | 'output'>,
  sqlFirst: boolean,
): RfbaInspectResult['features'][number]['standard'] {
  const warnings: string[] = [];
  if (sqlFirst) {
    return {
      status: 'standard',
      warnings,
    };
  }
  const boundarySource = readExistingFile(path.join(featureDir, 'boundary.ts'));
  const inputSource = readExistingFile(path.join(featureDir, 'input.ts'));
  const workflowSource = readExistingFile(path.join(featureDir, 'workflow.ts'));
  const outputSource = readExistingFile(path.join(featureDir, 'output.ts'));

  if (!files.input.exists) warnings.push(`RFBA standard input file is missing: ${files.input.path}.`);
  if (!files.workflow.exists) warnings.push(`RFBA standard workflow file is missing: ${files.workflow.path}.`);
  if (!files.output.exists) warnings.push(`RFBA standard output file is missing: ${files.output.path}.`);

  if (boundarySource) {
    const exportedRuntimeNames = collectExportedRuntimeNames(boundarySource);
    if (!exportedRuntimeNames.includes('execute')) {
      warnings.push(`Boundary should expose execute as the primary feature entrypoint: ${files.boundary.path}.`);
    }
    const extraExports = exportedRuntimeNames.filter((name) => name !== 'execute');
    if (extraExports.length > 0) {
      warnings.push(`Boundary exposes multiple runtime entrypoints (${exportedRuntimeNames.join(', ')}); RFBA expects one primary function entrypoint, usually execute. Split the boundary or mark this as custom-owned code if the extra entrypoints are intentional.`);
    }
  }
  if (inputSource) {
    if (!/\bfunction\s+parseRequest\b/.test(inputSource)) {
      warnings.push(`Input boundary should expose parseRequest(raw: unknown): ${files.input.path}.`);
    }
    if (/\bimport\s+(?!type\b)[^;]*from\s+['"][^'"]*\/queries\//.test(inputSource)) {
      warnings.push(`Input boundary imports query files; keep SQL/query ownership in workflow instead: ${files.input.path}.`);
    }
  }
  if (workflowSource) {
    if (!/\bfunction\s+executeWorkflow\b/.test(workflowSource)) {
      warnings.push(`Workflow should expose executeWorkflow(...): ${files.workflow.path}.`);
    }
    if (!/\binterface\s+\w*Queries\b/.test(workflowSource)) {
      warnings.push(`Workflow should expose a Queries interface so query dependencies stay injectable: ${files.workflow.path}.`);
    }
    if (/\braw\w*\s*:\s*unknown\b/.test(workflowSource)) {
      warnings.push(`Workflow should receive parsed input, not raw unknown input: ${files.workflow.path}.`);
    }
  }
  if (outputSource) {
    if (!/\bfunction\s+buildResult\b/.test(outputSource)) {
      warnings.push(`Output boundary should expose buildResult(...): ${files.output.path}.`);
    }
    if (/from\s+['"][^'"]*featureQueryExecutor\.js['"]/.test(outputSource)) {
      warnings.push(`Output boundary imports FeatureQueryExecutor; keep execution concerns in workflow: ${files.output.path}.`);
    }
  }

  return {
    status: warnings.length === 0 ? 'standard' : 'custom',
    warnings,
  };
}

function readExistingFile(filePath: string): string | undefined {
  return existsSync(filePath) && statSync(filePath).isFile() ? readFileSync(filePath, 'utf8') : undefined;
}

function collectExportedRuntimeNames(source: string): string[] {
  const names = new Set<string>();
  for (const match of source.matchAll(/\bexport\s+(?:async\s+)?function\s+([A-Za-z_$][\w$]*)/g)) {
    if (match[1]) names.add(match[1]);
  }
  for (const match of source.matchAll(/\bexport\s+(?:const|let|var|class)\s+([A-Za-z_$][\w$]*)/g)) {
    if (match[1]) names.add(match[1]);
  }
  return [...names];
}

function formatRfbaInspect(result: RfbaInspectResult): string {
  const lines = ['RFBA boundary inspection'];
  lines.push(`- attainment: ${result.attainment.overall}`);
  if (result.attainment.nextActions.length > 0) {
    for (const action of result.attainment.nextActions) {
      lines.push(`- next: ${action}`);
    }
  }
  for (const feature of result.features) {
    lines.push(
      '',
      `- feature: ${feature.name}`,
      `  feature: ${formatFileStatus(feature.feature)}`,
      `  root sql: ${formatFileStatus(feature.rootSql)}`,
      `  boundary: ${formatFileStatus(feature.boundary)}`,
    );
    lines.push(
      `  input: ${formatFileStatus(feature.input)}`,
      `  workflow: ${formatFileStatus(feature.workflow)}`,
      `  output: ${formatFileStatus(feature.output)}`,
      `  standard: ${feature.standard.status}`,
    );
    for (const warning of feature.standard.warnings) {
      lines.push(`  warning: ${warning}`);
    }
    for (const issue of feature.issues) {
      lines.push(`  issue: ${issue}`);
    }
    for (const query of feature.queries) {
      lines.push(
        `  query: ${query.name}`,
        `    query: ${formatFileStatus(query.query)}`,
        `    sql: ${formatFileStatus(query.sql)}`,
      );
      for (const test of query.tests) {
        lines.push(`    test: ${formatFileStatus(test)}`);
      }
      for (const issue of query.issues) {
        lines.push(`    issue: ${issue}`);
      }
    }
  }
  if (result.features.length === 0) {
    lines.push('- no feature boundaries discovered');
  }
  return `${lines.join('\n')}\n`;
}

function formatFileStatus(file: RfbaFileStatus): string {
  return `${file.path} (${file.exists ? 'exists' : 'missing'})`;
}

function normalizePath(value: string): string {
  return value.replace(/\\/g, '/');
}
