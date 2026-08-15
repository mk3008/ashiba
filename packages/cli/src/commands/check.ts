import { spawnSync } from 'node:child_process';
import type { Command } from 'commander';
import { formatProjectCheckResult, runProjectCheck, type ProjectCheckOptions, type ProjectCheckResult } from './project.js';
import { runFeatureGeneratedRefresh, type FeatureGeneratedRefreshResult } from './feature.js';

export type AshibaCheckLevel = 'fast' | 'full';

export interface AshibaCheckOptions extends ProjectCheckOptions {
  fast?: boolean;
  full?: boolean;
  testCommand?: string;
  /** @deprecated Use testCommand. */
  mapperTestCommand?: string;
  fixGenerated?: boolean;
}

export interface AshibaCheckCommandResult {
  kind: 'ashiba-check';
  level: AshibaCheckLevel;
  ok: boolean;
  projectCheck: ProjectCheckResult;
  generatedRefresh?: FeatureGeneratedRefreshResult;
  mapperTest?: {
    command: string;
    ok: boolean;
    status: number | null;
    signal: NodeJS.Signals | null;
    error?: string;
    stdout?: string;
    stderr?: string;
  };
}

const DEFAULT_TEST_COMMAND = 'npx vitest run';

/**
 * Register the top-level human-first diagnostic command.
 */
export function registerCheckCommand(program: Command): void {
  program
    .command('check')
    .description('Run the human-first Ashiba diagnostic gate')
    .option('--root-dir <path>', 'Project root directory', '.')
    .option('--format <format>', 'Output format: text or json', 'text')
    .option('--warnings-as-errors', 'Treat warnings as check failures', false)
    .option('--fast', 'Run the fast local check only. This is the default.', false)
    .option('--full', 'Run the fast check and the configured verification test command.', false)
    .option('--test-command <command>', 'Verification test command used by --full')
    .option('--mapper-test-command <command>', 'Deprecated alias for --test-command')
    .option('--fix-generated', 'Refresh safe library-owned artifacts before reporting application-owned changes', false)
    .action((options: AshibaCheckOptions) => {
      const result = runAshibaCheck(options);
      if (options.format === 'json') {
        process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
      } else {
        process.stdout.write(formatAshibaCheckResult(result, options));
      }
      if (!result.ok) process.exit(1);
    });
}

/**
 * Run the Ashiba diagnostic gate without going through Commander.
 */
export function runAshibaCheck(options: AshibaCheckOptions = {}): AshibaCheckCommandResult {
  const level = resolveCheckLevel(options);
  const generatedRefresh = options.fixGenerated === true
    ? runFeatureGeneratedRefresh({ rootDir: options.rootDir })
    : undefined;
  const projectCheck = runProjectCheck(options);
  const result: AshibaCheckCommandResult = {
    kind: 'ashiba-check',
    level,
    ok: projectCheck.ok && (generatedRefresh?.applicationOwnedIssues.length ?? 0) === 0,
    projectCheck,
    ...(generatedRefresh ? { generatedRefresh } : {}),
  };

  if (level === 'full' && projectCheck.ok) {
    const command = (options.testCommand ?? options.mapperTestCommand ?? DEFAULT_TEST_COMMAND).trim();
    const mapperTest = runMapperTestCommand(command, projectCheck.rootDir, options.format === 'json');
    result.mapperTest = mapperTest;
    result.ok = result.ok && mapperTest.ok;
  }

  return result;
}

/**
 * Format a diagnostic gate result for human CLI output.
 */
export function formatAshibaCheckResult(result: AshibaCheckCommandResult, options: AshibaCheckOptions = {}): string {
  const lines = [
    `Ashiba check: ${result.ok ? 'ok' : 'failed'}`,
    `- level: ${result.level}`,
    '',
    formatProjectCheckResult(result.projectCheck, options).trimEnd(),
  ];

  if (result.generatedRefresh) {
    lines.push(
      '',
      'Generated refresh:',
      `- changed generated files: ${result.generatedRefresh.changedGeneratedFiles.length}`,
      ...result.generatedRefresh.changedGeneratedFiles.map((file) => `  - ${file}`),
      `- application-owned issues: ${result.generatedRefresh.applicationOwnedIssues.length}`,
      ...result.generatedRefresh.applicationOwnedIssues.map((issue) => `  - ${issue}`),
    );
  }

  if (result.level === 'fast') {
    lines.push('', 'Next:', '- Use `ashiba check --full` before push, review, or CI when selected verification tests should run.');
  } else if (result.mapperTest) {
    lines.push(
      '',
      `Verification test: ${result.mapperTest.ok ? 'ok' : 'failed'}`,
      `- command: ${result.mapperTest.command}`,
    );
    if (!result.mapperTest.ok) {
      lines.push('- next: Fix the selected verification test failure, then rerun `ashiba check --full`.');
      if (result.mapperTest.error) lines.push(`- error: ${result.mapperTest.error}`);
    }
  } else {
    lines.push(
      '',
      'Verification test: skipped',
      '- reason: fast project check failed first.',
      '- next: Fix the fast check issues, then rerun `ashiba check --full`.',
    );
  }

  return `${lines.join('\n')}\n`;
}

function resolveCheckLevel(options: AshibaCheckOptions): AshibaCheckLevel {
  if (options.fast === true && options.full === true) {
    throw new Error('Use either --fast or --full, not both.');
  }
  return options.full === true ? 'full' : 'fast';
}

function runMapperTestCommand(command: string, cwd: string, captureOutput: boolean): NonNullable<AshibaCheckCommandResult['mapperTest']> {
  if (command.length === 0) {
    return {
      command,
      ok: false,
      status: 1,
      signal: null,
      error: 'Verification test command is empty.',
    };
  }

  const result = spawnSync(command, {
    cwd,
    shell: true,
    stdio: captureOutput ? 'pipe' : 'inherit',
    encoding: captureOutput ? 'utf8' : undefined,
  });
  return {
    command,
    ok: result.status === 0 && !result.error,
    status: result.status,
    signal: result.signal,
    error: result.error?.message,
    ...(captureOutput ? {
      stdout: typeof result.stdout === 'string' ? result.stdout : '',
      stderr: typeof result.stderr === 'string' ? result.stderr : '',
    } : {}),
  };
}
