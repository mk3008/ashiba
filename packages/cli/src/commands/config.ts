import type { Command } from 'commander';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import type { SqlFormatterOptions } from 'rawsql-ts';
import { invalidCliInputError } from '../errors.js';
import { DEFAULT_SQL_FORMAT_OPTIONS } from '../sql-format.js';

export type AshibaConfig = {
  $schema: string;
  featureRoot: string;
  sqlRoots: string[];
  ddl: {
    sourceDir: string;
  };
  sql: {
    parameterStyle: 'colon' | 'at' | 'both';
  };
  format: {
    sql: Partial<SqlFormatterOptions>;
  };
  tests: {
    mapperLane: 'ztd' | 'traditional';
    performanceLane: 'traditional' | 'ztd';
  };
};

export type ConfigOptions = {
  pretty?: boolean;
};

export type ProjectPathConfig = {
  featureRoot: string;
  sqlRoots: string[];
};

export function createDefaultConfig(): AshibaConfig {
  return {
    $schema: 'https://ashiba.dev/schema/ashiba-config.json',
    featureRoot: 'src/features',
    sqlRoots: ['src/features'],
    ddl: {
      sourceDir: 'db/ddl',
    },
    sql: {
      parameterStyle: 'both',
    },
    format: {
      sql: DEFAULT_SQL_FORMAT_OPTIONS,
    },
    tests: {
      mapperLane: 'ztd',
      performanceLane: 'traditional',
    },
  };
}

export function loadProjectPathConfig(rootDir: string): ProjectPathConfig {
  const configPath = path.join(rootDir, 'ashiba.config.json');
  if (!existsSync(configPath)) {
    return { featureRoot: 'src/features', sqlRoots: ['src/features'] };
  }

  let parsed: {
    featureRoot?: unknown;
    sqlRoots?: unknown;
    features?: { sourceDir?: unknown };
  };
  try {
    parsed = JSON.parse(readFileSync(configPath, 'utf8')) as typeof parsed;
  } catch (error) {
    throw invalidCliInputError(
      'ASHIBA_CONFIG_JSON_PARSE_FAILED',
      'Failed to parse ashiba.config.json.',
      'Fix ashiba.config.json so it is valid JSON, or remove it to use the default project paths.',
      { configPath, reason: error instanceof Error ? error.message : String(error) },
    );
  }

  const featureRoot = nonEmptyString(parsed.featureRoot)
    ?? nonEmptyString(parsed.features?.sourceDir)
    ?? 'src/features';
  const sqlRoots = Array.isArray(parsed.sqlRoots)
    ? parsed.sqlRoots
      .filter((entry): entry is string => typeof entry === 'string' && entry.trim().length > 0)
      .map((entry) => entry.trim())
    : [];
  return {
    featureRoot,
    sqlRoots: sqlRoots.length > 0 ? sqlRoots : [featureRoot],
  };
}

export function formatDefaultConfig(options: ConfigOptions = {}): string {
  return `${JSON.stringify(createDefaultConfig(), null, options.pretty === false ? 0 : 2)}\n`;
}

export function registerConfigCommand(program: Command): void {
  program
    .command('config')
    .description('Print an Ashiba config starter')
    .option('--compact', 'Print compact JSON', false)
    .action((options: { compact?: boolean }) => {
      process.stdout.write(formatDefaultConfig({ pretty: options.compact !== true }));
    });
}

function nonEmptyString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined;
}
