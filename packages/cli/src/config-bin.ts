#!/usr/bin/env node

import { Command } from 'commander';
import { formatAshibaError, parseAshibaErrorMode, type AshibaErrorMode } from './error-format.js';
import { realpathSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { formatDefaultConfig } from './commands/config.js';

/**
 * Build the standalone ashiba-config Commander program.
 */
export function buildConfigProgram(): Command {
  return new Command()
    .name('ashiba-config')
    .description('Print an Ashiba config starter')
    .version('0.0.0')
    .option('--compact', 'Print compact JSON', false)
    .option('--error-format <mode>', 'Error output mode: human or ai', 'human')
    .action((options: { compact?: boolean }) => {
      process.stdout.write(formatDefaultConfig({ pretty: options.compact !== true }));
    });
}

/**
 * Run the standalone ashiba-config CLI with the provided argv vector.
 */
export async function main(argv: string[] = process.argv): Promise<void> {
  await buildConfigProgram().parseAsync(argv);
}

const currentFile = fileURLToPath(import.meta.url);
const invokedFile = process.argv[1] ? path.resolve(process.argv[1]) : undefined;

if (isCliEntrypoint(invokedFile, currentFile, 'ashiba-config')) {
  const program = buildConfigProgram();
  void program.parseAsync(process.argv).catch((error) => {
    process.stderr.write(formatAshibaError(error, safeGetErrorMode(program)).text);
    process.exit(1);
  });
}

function safeGetErrorMode(program: Command): AshibaErrorMode {
  try {
    const options = program.opts<{ errorFormat?: string }>();
    return parseAshibaErrorMode(options.errorFormat);
  } catch {
    return 'human';
  }
}

function isCliEntrypoint(invokedFile: string | undefined, currentFile: string, binName: string): boolean {
  if (!invokedFile) return false;
  if (safeRealpath(currentFile) === safeRealpath(invokedFile)) return true;
  const invokedBase = path.basename(invokedFile).toLowerCase();
  return invokedBase === binName
    || invokedBase === `${binName}.js`
    || invokedBase === `${binName}.cmd`
    || invokedBase === `${binName}.ps1`;
}

function safeRealpath(filePath: string): string {
  try {
    return realpathSync(filePath);
  } catch {
    return path.resolve(filePath);
  }
}
