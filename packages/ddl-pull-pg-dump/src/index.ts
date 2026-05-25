import { spawn } from 'node:child_process';

/**
 * Options used to construct an explicit PostgreSQL pg_dump schema-only command.
 */
export type PgDumpSchemaPullOptions = {
  databaseUrl?: string;
  database?: string;
  host?: string;
  port?: number;
  username?: string;
  schemas?: readonly string[];
  executable?: string;
  extraArgs?: readonly string[];
};

/**
 * Executable and raw arguments for a pg_dump invocation.
 */
export type PgDumpCommand = {
  command: string;
  args: string[];
};

/**
 * Executable and redacted arguments suitable for logs or diagnostics.
 */
export type PgDumpCommandPreview = {
  command: string;
  args: string[];
};

/**
 * Error raised when pg_dump cannot be started or exits unsuccessfully.
 */
export class AshibaDdlPullError extends Error {
  readonly code: 'ASHIBA_DDL_PULL_FAILED' | 'ASHIBA_DDL_PULL_SPAWN_FAILED';
  readonly exitCode: number | null;
  readonly stderr: string;
  readonly causeText: string;
  readonly nextAction: string;
  readonly details: Record<string, unknown>;

  constructor(
    code: AshibaDdlPullError['code'],
    message: string,
    params: {
      exitCode?: number | null;
      stderr?: string;
      causeText: string;
      nextAction: string;
      details?: Record<string, unknown>;
    },
  ) {
    super(message);
    this.name = 'AshibaDdlPullError';
    this.code = code;
    this.exitCode = params.exitCode ?? null;
    this.stderr = params.stderr ?? '';
    this.causeText = params.causeText;
    this.nextAction = params.nextAction;
    this.details = params.details ?? {};
  }
}

/**
 * Build the pg_dump command and unredacted argument list for schema pull.
 */
export function createPgDumpCommand(options: PgDumpSchemaPullOptions): PgDumpCommand {
  const command = options.executable ?? 'pg_dump';
  const args = buildPgDumpArgs(options);

  return { command, args };
}

/**
 * Build a pg_dump command preview with PostgreSQL connection-string passwords redacted.
 */
export function createPgDumpCommandPreview(options: PgDumpSchemaPullOptions): PgDumpCommandPreview {
  const command = createPgDumpCommand(options);
  return {
    command: command.command,
    args: command.args.map(redactPotentialConnectionString),
  };
}

/**
 * Build schema-only pg_dump arguments from explicit connection and schema options.
 */
export function buildPgDumpArgs(options: PgDumpSchemaPullOptions): string[] {
  const args = ['--schema-only', '--no-owner', '--no-privileges'];

  if (options.host) args.push('--host', options.host);
  if (options.port !== undefined) args.push('--port', String(options.port));
  if (options.username) args.push('--username', options.username);
  for (const schema of options.schemas ?? []) {
    args.push('--schema', schema);
  }
  args.push(...(options.extraArgs ?? []));

  if (options.databaseUrl) {
    args.push(options.databaseUrl);
  } else if (options.database) {
    args.push(options.database);
  }

  return args;
}

/**
 * Run pg_dump and return the pulled PostgreSQL schema DDL.
 */
export async function pullPostgresDdl(options: PgDumpSchemaPullOptions): Promise<string> {
  const { command, args } = createPgDumpCommand(options);

  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    const stdout: Buffer[] = [];
    const stderr: Buffer[] = [];

    child.stdout.on('data', (chunk: Buffer) => stdout.push(chunk));
    child.stderr.on('data', (chunk: Buffer) => stderr.push(chunk));
    child.on('error', (error) => {
      reject(new AshibaDdlPullError(
        'ASHIBA_DDL_PULL_SPAWN_FAILED',
        'DDL pull could not start pg_dump.',
        {
          causeText: error instanceof Error ? error.message : String(error),
          nextAction: 'Install pg_dump, pass the correct executable path, or run schema pull from an environment where PostgreSQL client tools are available.',
          details: { command, args: createPgDumpCommandPreview(options).args },
        },
      ));
    });
    child.on('close', (exitCode) => {
      const errorOutput = Buffer.concat(stderr).toString('utf8');
      if (exitCode !== 0) {
        reject(new AshibaDdlPullError(
          'ASHIBA_DDL_PULL_FAILED',
          `DDL pull failed${exitCode === null ? '' : ` with exit code ${exitCode}`}.`,
          {
            exitCode,
            stderr: errorOutput,
            causeText: errorOutput.trim() || 'pg_dump exited without producing a schema dump.',
            nextAction: 'Check the pg_dump connection options, credentials, database reachability, and schema filters, then rerun the explicit schema pull.',
            details: { command, args: createPgDumpCommandPreview(options).args },
          },
        ));
        return;
      }

      resolve(Buffer.concat(stdout).toString('utf8'));
    });
  });
}

function redactPotentialConnectionString(value: string): string {
  try {
    const url = new URL(value);
    if (!/^postgres(?:ql)?:$/i.test(url.protocol)) {
      return value;
    }
    if (url.password) {
      url.password = '****';
    }
    return url.toString();
  } catch {
    return value;
  }
}
