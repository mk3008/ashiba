import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import type { Command } from 'commander';
import { invalidCliInputError } from '../errors.js';

export interface AtlasInitOptions {
  rootDir?: string;
}

export interface AtlasInitResult {
  rootDir: string;
  created: string[];
  skipped: string[];
  suggestedScripts: Record<string, string> | undefined;
}

type AtlasFile = {
  path: string;
  contents: string;
};

export function registerAtlasCommand(program: Command): void {
  const atlas = program
    .command('atlas')
    .description('Optional Atlas workflow scaffolding');

  atlas
    .command('init')
    .description('Create optional Atlas workflow files without installing or requiring Atlas')
    .option('--root-dir <path>', 'Project root directory', '.')
    .action((options: AtlasInitOptions) => {
      const result = runAtlasInit(options);
      process.stdout.write(formatAtlasInitResult(result));
    });
}

export function runAtlasInit(options: AtlasInitOptions = {}): AtlasInitResult {
  const rootDir = path.resolve(options.rootDir ?? '.');
  const ddlSourceDir = resolveDdlSourceDir(rootDir);
  const files: AtlasFile[] = [
    {
      path: 'atlas.hcl',
      contents: renderAtlasHcl(ddlSourceDir),
    },
    {
      path: 'migrations/.gitkeep',
      contents: '',
    },
    {
      path: 'docs/recipes/migration-with-atlas.md',
      contents: renderAtlasRecipe(ddlSourceDir),
    },
  ];
  const created: string[] = [];
  const skipped: string[] = [];

  for (const file of files) {
    const destination = path.join(rootDir, file.path);
    if (existsSync(destination)) {
      skipped.push(file.path);
      continue;
    }
    mkdirSync(path.dirname(destination), { recursive: true });
    writeFileSync(destination, file.contents, 'utf8');
    created.push(file.path);
  }

  return {
    rootDir,
    created,
    skipped,
    suggestedScripts: existsSync(path.join(rootDir, 'package.json')) ? createSuggestedScripts() : undefined,
  };
}

export function formatAtlasInitResult(result: AtlasInitResult): string {
  const title = result.skipped.length > 0 ? 'Atlas workflow scaffold checked.' : 'Atlas workflow scaffold created.';
  const lines = [title, ''];

  if (result.created.length > 0) {
    lines.push('Created:');
    lines.push(...result.created.map((file) => `- ${file}`));
    lines.push('');
  }

  if (result.skipped.length > 0) {
    lines.push('Skipped because already exists:');
    lines.push(...result.skipped.map((file) => `- ${file}`));
    lines.push('', 'No existing files were overwritten.', '');
  }

  lines.push(
    'Atlas is optional.',
    'Ashiba does not install or require Atlas.',
    'Install the Atlas CLI yourself if you want to use this workflow.',
  );

  if (result.suggestedScripts) {
    lines.push(
      '',
      'Suggested package.json scripts:',
      JSON.stringify({ scripts: result.suggestedScripts }, null, 2),
    );
  }

  return `${lines.join('\n')}\n`;
}

function createSuggestedScripts(): Record<string, string> {
  return {
    'db:migration:diff': 'atlas migrate diff --env local',
    'db:migration:status': 'atlas migrate status --env local',
    'db:migration:apply:local': 'atlas migrate apply --env local',
    'ashiba:check': 'ashiba check',
  };
}

function renderAtlasHcl(ddlSourceDir: string): string {
  return [
    'env "local" {',
    `  src = "file://${toAtlasPath(ddlSourceDir)}"`,
    '  dev = "docker://postgres/16/dev?search_path=public"',
    '',
    '  migration {',
    '    dir = "file://migrations"',
    '  }',
    '}',
    '',
  ].join('\n');
}

function renderAtlasRecipe(ddlSourceDir: string): string {
  return [
    '# Migration with Atlas',
    '',
    "Ashiba's default development workflow is migration zero.",
    'Atlas is optional and is only needed when DDL changes must be carried into a stateful database environment.',
    'Ashiba does not install, bundle, or require Atlas.',
    '',
    'Ashiba handles SQL and DDL consistency.',
    'Atlas handles versioned database migration when you need it.',
    '',
    '## When To Use Atlas',
    '',
    'In normal local development, change the DDL source, rebuild the development database with ZTD, and run Ashiba checks.',
    '',
    'Atlas is useful at release boundaries where a database cannot simply be destroyed and recreated:',
    '',
    '- E2E environments that need to test the migration path',
    '- shared development databases',
    '- staging databases',
    '- production databases',
    '',
    'Atlas is not required for normal Ashiba usage.',
    'Atlas Pro is not required for the default Ashiba workflow.',
    'Atlas Pro features, such as migration linting, are optional governance layers.',
    '',
    '## Generated Configuration',
    '',
    `This project uses \`${ddlSourceDir}\` as the DDL source for Atlas:`,
    '',
    '```hcl',
    `src = "file://${toAtlasPath(ddlSourceDir)}"`,
    '```',
    '',
    '## Suggested Flow',
    '',
    '1. Change the DDL source.',
    '2. Change SQL and application code if needed.',
    '3. Rebuild the local development database with ZTD.',
    '4. Run `ashiba check`.',
    '5. When a stateful environment needs the change, use Atlas to create a migration.',
    '6. Review migration SQL.',
    '7. Apply migration in the deployment process.',
    '',
    'Production apply should be owned by the project deployment policy, not by Ashiba.',
    'Ashiba does not own production migration apply, rollback policy, locking policy, approvals, or incident response.',
    '',
    '## Atlas Commands',
    '',
    'Install the Atlas CLI yourself before using these commands.',
    '',
    '```bash',
    'atlas migrate diff <name> --env local',
    'atlas migrate status --env local',
    'atlas migrate apply --env local',
    '```',
    '',
    '## Optional Atlas Pro Governance',
    '',
    'If your team uses Atlas Pro, migration linting can be added as an optional governance layer.',
    'Do not make it part of the default Ashiba workflow unless your project has chosen that policy.',
    '',
    '```json',
    '{',
    '  "scripts": {',
    '    "db:migration:lint:pro": "atlas migrate lint --env local --latest 1"',
    '  }',
    '}',
    '```',
    '',
  ].join('\n');
}

function resolveDdlSourceDir(rootDir: string): string {
  const configPath = path.join(rootDir, 'ashiba.config.json');
  if (!existsSync(configPath)) {
    return 'db/ddl';
  }

  try {
    const parsed = JSON.parse(readFileSync(configPath, 'utf8')) as {
      ddl?: { sourceDir?: unknown };
      ddlDir?: unknown;
    };
    const configured = nonEmptyString(parsed.ddl?.sourceDir) ?? nonEmptyString(parsed.ddlDir);
    return configured ?? 'db/ddl';
  } catch (error) {
    throw invalidCliInputError(
      'ASHIBA_CONFIG_JSON_PARSE_FAILED',
      'Failed to parse ashiba.config.json.',
      'Fix ashiba.config.json so it is valid JSON, or remove it to use the default db/ddl directory.',
      { configPath, reason: error instanceof Error ? error.message : String(error) },
    );
  }
}

function nonEmptyString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined;
}

function toAtlasPath(value: string): string {
  return value.replace(/\\/g, '/');
}
