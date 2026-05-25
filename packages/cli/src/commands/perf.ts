import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import type { Command } from 'commander';
import { compileNamedParameters } from '../parameter-metadata.js';
import { requiredCliValueError } from '../errors.js';

export interface PerfInitOptions {
  rootDir?: string;
  dryRun?: boolean;
  force?: boolean;
  format?: 'text' | 'json';
}

export interface PerfRunOptions {
  rootDir?: string;
  query?: string;
  params?: string;
  dryRun?: boolean;
  format?: 'text' | 'json';
}

export interface PerfReportDiffOptions {
  format?: 'text' | 'json';
}

export interface PerfInitResult {
  rootDir: string;
  dryRun: boolean;
  files: Array<{ path: string; written: boolean }>;
}

export interface PerfRunResult {
  rootDir: string;
  query: string;
  attainment: PerfAttainment;
  parameterNames: string[];
  providedParams: string[];
  missingParams: string[];
  unusedParams: string[];
  dryRun: boolean;
  mode: 'traditional';
  ok: boolean;
}

export interface PerfAttainment {
  overall: 'done' | 'partial' | 'not done';
  nextActions: string[];
}

export interface PerfReportDiffResult {
  baseline: string;
  candidate: string;
  attainment: PerfAttainment;
  baselineDurationMs: number | null;
  candidateDurationMs: number | null;
  deltaMs: number | null;
  ratio: number | null;
  classification: 'faster' | 'slower' | 'same' | 'unknown';
}

export function registerPerfCommand(program: Command): void {
  const perf = program.command('perf').description('Traditional DB-backed performance test helpers');
  const report = perf.command('report').description('Compare saved performance evidence');

  perf
    .command('init')
    .description('Scaffold the opt-in performance sandbox files')
    .option('--root-dir <path>', 'Project root directory', '.')
    .option('--dry-run', 'Print the files that would be created without writing them', false)
    .option('--force', 'Overwrite perf scaffold files when they already exist', false)
    .option('--format <format>', 'Output format: text or json', 'text')
    .action((options: PerfInitOptions) => {
      const result = runPerfInit(options);
      writeResult('perf-init', result, options.format, formatPerfInitResult);
    });

  perf
    .command('run')
    .description('Inspect a SQL performance run plan without owning DB execution')
    .requiredOption('--query <path>', 'SQL file to benchmark in the application-owned performance lane')
    .option('--params <path>', 'JSON parameter file for the benchmark query')
    .option('--root-dir <path>', 'Project root directory', '.')
    .option('--dry-run', 'Inspect the run plan without executing a DB query', false)
    .option('--format <format>', 'Output format: text or json', 'text')
    .action((options: PerfRunOptions) => {
      const result = runPerfRun(options);
      writeResult('perf-run', result, options.format, formatPerfRunResult);
      if (!result.ok) process.exitCode = 1;
    });

  report
    .command('diff <baseline> <candidate>')
    .description('Compare two saved performance report JSON files')
    .option('--format <format>', 'Output format: text or json', 'text')
    .action((baseline: string, candidate: string, options: PerfReportDiffOptions) => {
      const result = runPerfReportDiff(baseline, candidate);
      writeResult('perf-report-diff', result, options.format, formatPerfReportDiffResult);
    });
}

export function runPerfInit(options: PerfInitOptions = {}): PerfInitResult {
  const rootDir = path.resolve(options.rootDir ?? '.');
  const files = [
    {
      path: 'perf/README.md',
      contents: [
        '# Performance Lane',
        '',
        'Ashiba recommends traditional DB-backed tests for performance evidence.',
        'Ashiba can scaffold and inspect the plan, but DB lifecycle and execution remain application-owned.',
        '',
      ].join('\n'),
    },
    {
      path: 'perf/params.json',
      contents: `${JSON.stringify({}, null, 2)}\n`,
    },
    {
      path: 'perf/evidence/.gitkeep',
      contents: '',
    },
  ];
  const written = files.map((file) => {
    const destination = path.join(rootDir, file.path);
    const exists = existsSync(destination);
    if (!options.dryRun && (!exists || options.force)) {
      mkdirSync(path.dirname(destination), { recursive: true });
      writeFileSync(destination, file.contents, 'utf8');
    }
    return { path: file.path, written: options.dryRun !== true && (!exists || options.force === true) };
  });
  return { rootDir, dryRun: options.dryRun === true, files: written };
}

export function runPerfRun(options: PerfRunOptions): PerfRunResult {
  const rootDir = path.resolve(options.rootDir ?? '.');
  const query = requireValue(options.query, '--query');
  const queryPath = path.resolve(rootDir, query);
  const sql = readFileSync(queryPath, 'utf8');
  const parameterNames = [...new Set(compileNamedParameters(sql).orderedNames)].sort();
  const providedParams = options.params ? Object.keys(JSON.parse(readFileSync(path.resolve(rootDir, options.params), 'utf8')) as Record<string, unknown>).sort() : [];
  const missingParams = parameterNames.filter((name) => !providedParams.includes(name));
  const unusedParams = providedParams.filter((name) => !parameterNames.includes(name));

  return {
    rootDir,
    query: normalizePath(path.relative(rootDir, queryPath)),
    attainment: buildPerfRunAttainment(missingParams, unusedParams),
    parameterNames,
    providedParams,
    missingParams,
    unusedParams,
    dryRun: options.dryRun === true,
    mode: 'traditional',
    ok: missingParams.length === 0 && unusedParams.length === 0,
  };
}

export function runPerfReportDiff(baseline: string, candidate: string): PerfReportDiffResult {
  const baselinePath = path.resolve(baseline);
  const candidatePath = path.resolve(candidate);
  const baselineDurationMs = readDurationMs(JSON.parse(readFileSync(baselinePath, 'utf8')) as unknown);
  const candidateDurationMs = readDurationMs(JSON.parse(readFileSync(candidatePath, 'utf8')) as unknown);
  const deltaMs = baselineDurationMs == null || candidateDurationMs == null ? null : candidateDurationMs - baselineDurationMs;
  const ratio = baselineDurationMs == null || candidateDurationMs == null || baselineDurationMs === 0 ? null : candidateDurationMs / baselineDurationMs;
  return {
    baseline: baselinePath,
    candidate: candidatePath,
    attainment: buildPerfReportAttainment(baselineDurationMs, candidateDurationMs),
    baselineDurationMs,
    candidateDurationMs,
    deltaMs,
    ratio,
    classification: classifyPerfDelta(deltaMs),
  };
}

function formatPerfInitResult(result: PerfInitResult): string {
  return `${['Perf sandbox scaffold', ...result.files.map((file) => `- ${file.written ? 'write' : 'skip'}: ${file.path}`)].join('\n')}\n`;
}

function formatPerfRunResult(result: PerfRunResult): string {
  return `${[
    `Perf run plan: ${result.ok ? 'ok' : 'failed'}`,
    `- attainment: ${result.attainment.overall}`,
    `- mode: ${result.mode}`,
    `- query: ${result.query}`,
    `- parameters: ${result.parameterNames.length > 0 ? result.parameterNames.join(', ') : '(none)'}`,
    `- provided: ${result.providedParams.length > 0 ? result.providedParams.join(', ') : '(none)'}`,
    ...(result.missingParams.length > 0 ? [`- missing params: ${result.missingParams.join(', ')}`] : []),
    ...(result.unusedParams.length > 0 ? [`- unused params: ${result.unusedParams.join(', ')}`] : []),
    ...result.attainment.nextActions.map((action) => `- next: ${action}`),
  ].join('\n')}\n`;
}

function formatPerfReportDiffResult(result: PerfReportDiffResult): string {
  return `${[
    `Perf report diff: ${result.classification}`,
    `- attainment: ${result.attainment.overall}`,
    `- baseline duration ms: ${result.baselineDurationMs ?? 'unknown'}`,
    `- candidate duration ms: ${result.candidateDurationMs ?? 'unknown'}`,
    `- delta ms: ${result.deltaMs ?? 'unknown'}`,
    `- ratio: ${result.ratio ?? 'unknown'}`,
    ...result.attainment.nextActions.map((action) => `- next: ${action}`),
  ].join('\n')}\n`;
}

function buildPerfRunAttainment(missingParams: string[], unusedParams: string[]): PerfAttainment {
  const nextActions: string[] = [];
  if (missingParams.length > 0) {
    nextActions.push('Add missing benchmark parameters before running the application-owned performance test.');
  }
  if (unusedParams.length > 0) {
    nextActions.push('Remove unused benchmark parameters so the performance evidence matches visible SQL.');
  }
  return {
    overall: nextActions.length === 0 ? 'done' : 'partial',
    nextActions,
  };
}

function buildPerfReportAttainment(baselineDurationMs: number | null, candidateDurationMs: number | null): PerfAttainment {
  const nextActions: string[] = [];
  if (baselineDurationMs == null) {
    nextActions.push('Add a numeric durationMs or duration_ms to the baseline performance report.');
  }
  if (candidateDurationMs == null) {
    nextActions.push('Add a numeric durationMs or duration_ms to the candidate performance report.');
  }
  return {
    overall: nextActions.length === 0 ? 'done' : 'partial',
    nextActions,
  };
}

function readDurationMs(value: unknown): number | null {
  if (!isRecord(value)) {
    return null;
  }
  const direct = value.durationMs ?? value.duration_ms;
  if (typeof direct === 'number') {
    return direct;
  }
  if (isRecord(value.summary)) {
    const summary = value.summary.durationMs ?? value.summary.duration_ms;
    if (typeof summary === 'number') {
      return summary;
    }
  }
  if (isRecord(value.metrics)) {
    const metric = value.metrics.durationMs ?? value.metrics.duration_ms;
    if (typeof metric === 'number') {
      return metric;
    }
  }
  return null;
}

function classifyPerfDelta(deltaMs: number | null): PerfReportDiffResult['classification'] {
  if (deltaMs == null) return 'unknown';
  if (Math.abs(deltaMs) < 1) return 'same';
  return deltaMs > 0 ? 'slower' : 'faster';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function writeResult<T>(kind: string, result: T, format: string | undefined, render: (result: T) => string): void {
  if (format === 'json') {
    process.stdout.write(`${JSON.stringify({ kind, ...result }, null, 2)}\n`);
  } else {
    process.stdout.write(render(result));
  }
}

function requireValue(value: string | undefined, label: string): string {
  if (!value || value.trim().length === 0) throw requiredCliValueError(label);
  return value;
}

function normalizePath(value: string): string {
  return value.replace(/\\/g, '/');
}
