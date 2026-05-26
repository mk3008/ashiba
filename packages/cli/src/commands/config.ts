import type { Command } from 'commander';

export type AshibaConfig = {
  $schema: string;
  ddl: {
    sourceDir: string;
  };
  features: {
    sourceDir: string;
  };
  sql: {
    parameterStyle: 'colon' | 'at' | 'both';
  };
  tests: {
    mapperLane: 'ztd' | 'traditional';
    performanceLane: 'traditional' | 'ztd';
  };
};

export type ConfigOptions = {
  pretty?: boolean;
};

export function createDefaultConfig(): AshibaConfig {
  return {
    $schema: 'https://ashiba.dev/schema/ashiba-config.json',
    ddl: {
      sourceDir: 'db/ddl',
    },
    features: {
      sourceDir: 'src/features',
    },
    sql: {
      parameterStyle: 'both',
    },
    tests: {
      mapperLane: 'ztd',
      performanceLane: 'traditional',
    },
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
