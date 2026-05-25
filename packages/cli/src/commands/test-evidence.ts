import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import type { Command } from 'commander';

export interface TestEvidenceOptions {
  rootDir?: string;
  outDir?: string;
  format?: 'text' | 'json';
  dryRun?: boolean;
}

export interface TestEvidenceResult {
  rootDir: string;
  outDir: string;
  attainment: TestEvidenceAttainment;
  testFiles: string[];
  mapperTests: string[];
  performanceTests: string[];
  testFileDetails: TestFileEvidence[];
  resultFiles: string[];
  lanes: {
    mapper: TestEvidenceLane;
    performance: TestEvidenceLane;
  };
  written: string[];
  dryRun: boolean;
}

export interface TestEvidenceAttainment {
  overall: 'done' | 'partial' | 'not done';
  mapper: 'done' | 'partial' | 'not done';
  performance: 'done' | 'partial' | 'not done';
  nextActions: string[];
}

export interface TestEvidenceLane {
  recommendedMode: 'zero-table-dependency' | 'traditional-db-backed';
  status: 'present' | 'missing' | 'needs-implementation';
  files: string[];
  todoFiles: string[];
  resultFiles: string[];
  nextAction?: string;
}

export interface TestFileEvidence {
  file: string;
  lane: 'mapper' | 'performance' | 'other';
  todoCount: number;
  hasExecutableTest: boolean;
}

export interface TestEvidenceDiffOptions {
  format?: 'text' | 'json';
}

export interface TestEvidenceRenderOptions {
  out?: string;
  format?: 'text' | 'json';
}

export interface TestEvidenceDiffResult {
  baseline: string;
  candidate: string;
  added: string[];
  removed: string[];
  mapperDelta: number;
  performanceDelta: number;
}

export interface TestEvidenceRenderResult {
  summary: string;
  out?: string;
  markdown: string;
  written: boolean;
}

export function registerTestEvidenceCommand(program: Command): void {
  const evidence = program.command('test-evidence').description('Collect lightweight test evidence for mapper and performance lanes');

  evidence
    .command('collect')
    .description('Collect test file inventory and lane recommendations')
    .option('--root-dir <path>', 'Project root directory', '.')
    .option('--out-dir <path>', 'Output directory', 'artifacts/test-evidence')
    .option('--dry-run', 'Preview collected evidence without writing summary files', false)
    .option('--format <format>', 'Output format: text or json', 'text')
    .action((options: TestEvidenceOptions) => {
      const result = runTestEvidenceCollect(options);
      if (options.format === 'json') {
        process.stdout.write(`${JSON.stringify({ kind: 'test-evidence-collect', ...result }, null, 2)}\n`);
      } else {
        process.stdout.write(formatTestEvidenceResult(result));
      }
    });

  evidence
    .command('render <summary>')
    .description('Render a collected test evidence summary.json as Markdown')
    .option('--out <path>', 'Write rendered Markdown to this path')
    .option('--format <format>', 'Output format: text or json', 'text')
    .action((summary: string, options: TestEvidenceRenderOptions) => {
      const result = runTestEvidenceRender(summary, options);
      if (options.format === 'json') {
        process.stdout.write(`${JSON.stringify({ kind: 'test-evidence-render', ...result }, null, 2)}\n`);
      } else if (result.out) {
        process.stdout.write(`Test evidence rendered: ${result.out}\n`);
      } else {
        process.stdout.write(result.markdown);
      }
    });

  evidence
    .command('diff <baseline> <candidate>')
    .description('Compare two collected test evidence summary.json files')
    .option('--format <format>', 'Output format: text or json', 'text')
    .action((baseline: string, candidate: string, options: TestEvidenceDiffOptions) => {
      const result = runTestEvidenceDiff(baseline, candidate);
      if (options.format === 'json') {
        process.stdout.write(`${JSON.stringify({ kind: 'test-evidence-diff', ...result }, null, 2)}\n`);
      } else {
        process.stdout.write(formatTestEvidenceDiff(result));
      }
    });
}

export function runTestEvidenceCollect(options: TestEvidenceOptions = {}): TestEvidenceResult {
  const rootDir = path.resolve(options.rootDir ?? '.');
  const outDir = path.resolve(rootDir, options.outDir ?? 'artifacts/test-evidence');
  const testFiles = collectTestFiles(rootDir);
  const mapperTests = testFiles.filter((file) => /\.ztd\.test\.ts$|mapper/i.test(file));
  const performanceTests = testFiles.filter((file) => /perf|performance/i.test(file));
  const testFileDetails = testFiles.map((file) => inspectTestFile(rootDir, file, mapperTests, performanceTests));
  const resultFiles = collectResultFiles(rootDir);
  const lanes = {
    mapper: buildLaneEvidence(
      'zero-table-dependency',
      mapperTests,
      testFileDetails,
      resultFiles,
      'Add mapper tests in the Zero Table Dependency lane for generated SQL-to-DTO contracts.',
      'Replace mapper test.todo placeholders with executable mapper assertions.',
    ),
    performance: buildLaneEvidence(
      'traditional-db-backed',
      performanceTests,
      testFileDetails,
      resultFiles,
      'Add traditional DB-backed performance tests for representative production queries.',
      'Replace performance test.todo placeholders and store benchmark output under perf/evidence or artifacts/test-evidence.',
    ),
  };
  const result = {
    rootDir,
    outDir: normalizePath(path.relative(rootDir, outDir)),
    attainment: buildAttainment(lanes),
    testFiles,
    mapperTests,
    performanceTests,
    testFileDetails,
    resultFiles,
    lanes,
    written: [] as string[],
    dryRun: options.dryRun === true,
  };
  const summaryPath = path.join(outDir, 'summary.json');
  const markdownPath = path.join(outDir, 'README.md');
  if (options.dryRun === true) {
    result.written.push(
      `${normalizePath(path.relative(rootDir, summaryPath))} (dry-run, not written)`,
      `${normalizePath(path.relative(rootDir, markdownPath))} (dry-run, not written)`,
    );
  } else {
    mkdirSync(outDir, { recursive: true });
    writeFileSync(summaryPath, `${JSON.stringify(result, null, 2)}\n`, 'utf8');
    writeFileSync(markdownPath, renderEvidenceMarkdown(result), 'utf8');
    result.written.push(normalizePath(path.relative(rootDir, summaryPath)), normalizePath(path.relative(rootDir, markdownPath)));
  }
  return result;
}

export function runTestEvidenceDiff(baseline: string, candidate: string): TestEvidenceDiffResult {
  const baselinePath = path.resolve(baseline);
  const candidatePath = path.resolve(candidate);
  const baselineSummary = readEvidenceSummary(baselinePath);
  const candidateSummary = readEvidenceSummary(candidatePath);
  return {
    baseline: baselinePath,
    candidate: candidatePath,
    added: candidateSummary.testFiles.filter((file) => !baselineSummary.testFiles.includes(file)),
    removed: baselineSummary.testFiles.filter((file) => !candidateSummary.testFiles.includes(file)),
    mapperDelta: candidateSummary.mapperTests.length - baselineSummary.mapperTests.length,
    performanceDelta: candidateSummary.performanceTests.length - baselineSummary.performanceTests.length,
  };
}

export function runTestEvidenceRender(summary: string, options: TestEvidenceRenderOptions = {}): TestEvidenceRenderResult {
  const summaryPath = path.resolve(summary);
  const result = readEvidenceSummary(summaryPath);
  const markdown = renderEvidenceMarkdown(result);
  const out = options.out ? path.resolve(path.dirname(summaryPath), options.out) : undefined;
  if (out) {
    mkdirSync(path.dirname(out), { recursive: true });
    writeFileSync(out, markdown, 'utf8');
  }
  return {
    summary: summaryPath,
    ...(out ? { out } : {}),
    markdown,
    written: Boolean(out),
  };
}

function collectTestFiles(rootDir: string): string[] {
  const files = collectFiles(rootDir);
  return [...new Set(files)]
    .filter((file) => /\.(test|spec)\.(ts|tsx|js|jsx)$/.test(file))
    .map((file) => normalizePath(path.relative(rootDir, file)))
    .sort();
}

function collectFiles(target: string): string[] {
  const stat = statSync(target);
  if (stat.isFile()) return [target];
  if (!stat.isDirectory()) return [];
  return readdirSync(target).flatMap((entry) => {
    if (entry === 'node_modules' || entry === 'dist' || entry === '.vite' || entry === '.git') return [];
    return collectFiles(path.join(target, entry));
  });
}

function renderEvidenceMarkdown(result: TestEvidenceResult): string {
  return [
    '# Test Evidence',
    '',
    `Total test files: ${result.testFiles.length}`,
    `Mapper lane files: ${result.mapperTests.length}`,
    `Performance lane files: ${result.performanceTests.length}`,
    '',
    '## Review Summary',
    '',
    `- Overall attainment: ${result.attainment.overall}`,
    `- Mapper lane attainment: ${result.attainment.mapper}`,
    `- Performance lane attainment: ${result.attainment.performance}`,
    `- Evidence result files: ${result.resultFiles.length}`,
    ...result.attainment.nextActions.map((action) => `- Next action: ${action}`),
    '',
    '## Lane Status',
    '',
    renderLaneMarkdown('Mapper', result.lanes.mapper),
    '',
    renderLaneMarkdown('Performance', result.lanes.performance),
    '',
    '## Test File Details',
    '',
    ...renderTestFileDetails(result.testFileDetails),
    '',
    '## Test Files',
    '',
    ...renderFileList(result.testFiles),
    '',
  ].join('\n');
}

function formatLaneAttainment(lane: TestEvidenceLane): 'done' | 'partial' | 'not done' {
  switch (lane.status) {
    case 'present':
      return 'done';
    case 'needs-implementation':
      return 'partial';
    case 'missing':
    default:
      return 'not done';
  }
}

function formatTestEvidenceResult(result: TestEvidenceResult): string {
  return `${[
    'Test evidence collected',
    `- test files: ${result.testFiles.length}`,
    `- dry-run: ${result.dryRun}`,
    `- overall attainment: ${result.attainment.overall}`,
    `- mapper lane: ${result.lanes.mapper.status} (${result.mapperTests.length}, recommended: ${result.lanes.mapper.recommendedMode})`,
    `- performance lane: ${result.lanes.performance.status} (${result.performanceTests.length}, recommended: ${result.lanes.performance.recommendedMode})`,
    ...result.written.map((file) => `- wrote: ${file}`),
  ].join('\n')}\n`;
}

function formatTestEvidenceDiff(result: TestEvidenceDiffResult): string {
  return `${[
    'Test evidence diff',
    `- added: ${result.added.length}`,
    `- removed: ${result.removed.length}`,
    `- mapper delta: ${result.mapperDelta}`,
    `- performance delta: ${result.performanceDelta}`,
    ...result.added.map((file) => `  added: ${file}`),
    ...result.removed.map((file) => `  removed: ${file}`),
  ].join('\n')}\n`;
}

function readEvidenceSummary(file: string): TestEvidenceResult {
  const parsed = JSON.parse(readFileSync(file, 'utf8')) as Partial<TestEvidenceResult>;
  const mapperTests = parsed.mapperTests ?? [];
  const performanceTests = parsed.performanceTests ?? [];
  const lanes = parsed.lanes ?? {
    mapper: buildLaneEvidence('zero-table-dependency', mapperTests, parsed.testFileDetails ?? [], parsed.resultFiles ?? []),
    performance: buildLaneEvidence('traditional-db-backed', performanceTests, parsed.testFileDetails ?? [], parsed.resultFiles ?? []),
  };
  return {
    rootDir: parsed.rootDir ?? '',
    outDir: parsed.outDir ?? '',
    attainment: parsed.attainment ?? buildAttainment(lanes),
    testFiles: parsed.testFiles ?? [],
    mapperTests,
    performanceTests,
    testFileDetails: parsed.testFileDetails ?? [],
    resultFiles: parsed.resultFiles ?? [],
    lanes,
    written: parsed.written ?? [],
    dryRun: parsed.dryRun ?? false,
  };
}

function buildAttainment(lanes: TestEvidenceResult['lanes']): TestEvidenceAttainment {
  const mapper = formatLaneAttainment(lanes.mapper);
  const performance = formatLaneAttainment(lanes.performance);
  const laneValues = [mapper, performance];
  const overall = laneValues.every((value) => value === 'done')
    ? 'done'
    : laneValues.every((value) => value === 'not done')
      ? 'not done'
      : 'partial';
  return {
    overall,
    mapper,
    performance,
    nextActions: [lanes.mapper.nextAction, lanes.performance.nextAction].filter((action): action is string => Boolean(action)),
  };
}

function buildLaneEvidence(
  recommendedMode: TestEvidenceLane['recommendedMode'],
  files: string[],
  details: TestFileEvidence[] = [],
  resultFiles: string[] = [],
  missingNextAction?: string,
  todoNextAction?: string,
): TestEvidenceLane {
  const detailByFile = new Map(details.map((detail) => [detail.file, detail]));
  const todoFiles = files.filter((file) => (detailByFile.get(file)?.todoCount ?? 0) > 0 && detailByFile.get(file)?.hasExecutableTest !== true);
  const status = files.length === 0 ? 'missing' : todoFiles.length > 0 ? 'needs-implementation' : 'present';
  return {
    recommendedMode,
    status,
    files,
    todoFiles,
    resultFiles: resultFiles.filter((file) => recommendedMode === 'traditional-db-backed'
      ? /perf|performance|benchmark/i.test(file)
      : /mapper|ztd|test-evidence/i.test(file)),
    ...(status === 'missing' && missingNextAction ? { nextAction: missingNextAction } : {}),
    ...(status === 'needs-implementation' && todoNextAction ? { nextAction: todoNextAction } : {}),
  };
}

function renderLaneMarkdown(label: string, lane: TestEvidenceLane): string {
  return [
    `### ${label}`,
    '',
    `- Status: ${lane.status}`,
    `- Recommended mode: ${lane.recommendedMode}`,
    `- Files: ${lane.files.length}`,
    `- Todo-only files: ${lane.todoFiles.length}`,
    `- Result files: ${lane.resultFiles.length}`,
    ...(lane.nextAction ? [`- Next action: ${lane.nextAction}`] : []),
    '',
    ...renderFileList(lane.files),
    '',
    'Result files:',
    ...renderFileList(lane.resultFiles),
  ].join('\n');
}

function renderTestFileDetails(details: TestFileEvidence[]): string[] {
  if (details.length === 0) {
    return ['- (none)'];
  }
  return [
    '| File | Lane | Executable | Todo count |',
    '| --- | --- | --- | --- |',
    ...details
      .slice()
      .sort((left, right) => left.file.localeCompare(right.file))
      .map((detail) => `| ${detail.file} | ${detail.lane} | ${detail.hasExecutableTest ? 'yes' : 'no'} | ${detail.todoCount} |`),
  ];
}

function inspectTestFile(rootDir: string, file: string, mapperTests: string[], performanceTests: string[]): TestFileEvidence {
  const source = readFileSync(path.join(rootDir, file), 'utf8');
  const todoCount = (source.match(/\b(?:test|it|describe)\.todo\b|\.skip\b/g) ?? []).length;
  const executableMatches = source.match(/\b(?:test|it)\s*\(/g) ?? [];
  const lane = mapperTests.includes(file) ? 'mapper' : performanceTests.includes(file) ? 'performance' : 'other';
  return {
    file,
    lane,
    todoCount,
    hasExecutableTest: executableMatches.length > 0,
  };
}

function collectResultFiles(rootDir: string): string[] {
  return collectFiles(rootDir)
    .filter((file) => /\.(json|md|txt|xml)$/i.test(file))
    .filter((file) => /(^|[\\/])(artifacts|perf[\\/]evidence|test-results|coverage)([\\/]|$)/i.test(file))
    .map((file) => normalizePath(path.relative(rootDir, file)))
    .sort();
}

function renderFileList(files: string[]): string[] {
  if (files.length === 0) return ['- (none)'];
  return files.map((file) => `- ${file}`);
}

function normalizePath(value: string): string {
  return value.replace(/\\/g, '/');
}
