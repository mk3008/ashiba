export type AshibaErrorMode = 'human' | 'ai';

export type AshibaErrorDetails = {
  code?: string;
  message: string;
  cause?: string;
  nextAction?: string;
  details?: unknown;
};

export type AshibaFormattedError = {
  mode: AshibaErrorMode;
  text: string;
  data: AshibaErrorDetails;
};

export class AshibaUserError extends Error {
  readonly code: string;
  readonly causeText?: string;
  readonly nextAction?: string;
  readonly details?: unknown;

  constructor(input: AshibaErrorDetails & { code: string }) {
    super(input.message);
    this.name = 'AshibaUserError';
    this.code = input.code;
    this.causeText = input.cause;
    this.nextAction = input.nextAction;
    this.details = input.details;
  }
}

export function normalizeAshibaError(error: unknown): AshibaErrorDetails {
  if (error instanceof AshibaUserError) {
    return withActionableDefaults({
      code: error.code,
      message: error.message,
      ...(error.causeText ? { cause: error.causeText } : {}),
      ...(error.nextAction ? { nextAction: error.nextAction } : {}),
      ...(error.details !== undefined ? { details: error.details } : {}),
    });
  }

  if (error instanceof Error) {
    const code = hasStringCode(error) ? error.code : undefined;
    const causeText = hasStringProperty(error, 'causeText') ? error.causeText : undefined;
    const nextAction = hasStringProperty(error, 'nextAction') ? error.nextAction : undefined;
    const details = hasProperty(error, 'details') ? error.details : undefined;
    if (code?.startsWith('commander.')) {
      return normalizeCommanderError(error, code);
    }
    if (code === 'ENOENT') {
      return normalizeFileNotFoundError(error);
    }
    return withActionableDefaults({
      ...(code ? { code } : {}),
      message: error.message,
      cause: causeText ?? error.name,
      ...(nextAction ? { nextAction } : {}),
      ...(details !== undefined ? { details } : {}),
    });
  }

  return withActionableDefaults({
    message: String(error),
  });
}

export function formatAshibaError(error: unknown, mode: AshibaErrorMode = 'human'): AshibaFormattedError {
  const data = normalizeAshibaError(error);
  if (mode === 'ai') {
    return {
      mode,
      data,
      text: `${JSON.stringify({ error: data }, null, 2)}\n`,
    };
  }

  return {
    mode,
    data,
    text: formatHumanError(data),
  };
}

export function parseAshibaErrorMode(value: string | undefined): AshibaErrorMode {
  if (value === undefined || value === '' || value === 'human') return 'human';
  if (value === 'ai') return 'ai';
  throw new AshibaUserError({
    code: 'ASHIBA_INVALID_ERROR_FORMAT',
    message: `Invalid error format: ${value}`,
    cause: 'The error format must be either "human" or "ai".',
    nextAction: 'Use --error-format human or --error-format ai.',
    details: { value },
  });
}

function formatHumanError(data: AshibaErrorDetails): string {
  const lines = [`Error: ${data.message}`];

  if (data.code) lines.push(`Code: ${data.code}`);
  if (data.cause) lines.push(`Cause: ${data.cause}`);
  if (data.nextAction) lines.push(`Next: ${data.nextAction}`);

  return `${lines.join('\n')}\n`;
}

function withActionableDefaults(data: AshibaErrorDetails): AshibaErrorDetails {
  return {
    ...data,
    cause: data.cause ?? 'Ashiba received an error without structured cause metadata.',
    nextAction: data.nextAction ?? 'Use the error message and stack trace to identify the failing command or package, then add an Ashiba-specific cause and next action for this error path.',
  };
}

function hasStringCode(error: Error): error is Error & { code: string } {
  return 'code' in error && typeof error.code === 'string';
}

function hasProperty<PropertyName extends string>(
  error: Error,
  propertyName: PropertyName,
): error is Error & Record<PropertyName, unknown> {
  return propertyName in error;
}

function hasStringProperty<PropertyName extends string>(
  error: Error,
  propertyName: PropertyName,
): error is Error & Record<PropertyName, string> {
  return propertyName in error && typeof error[propertyName as keyof Error] === 'string';
}

function normalizeCommanderError(error: Error, code: string): AshibaErrorDetails {
  return {
    code: `ASHIBA_${code.replace(/^commander\./, '').replace(/[^A-Za-z0-9]+/g, '_').toUpperCase()}`,
    message: error.message,
    cause: 'The command line arguments did not match an Ashiba command contract.',
    nextAction: 'Run the command with --help to inspect the supported arguments and options.',
    details: {
      sourceCode: code,
      ...(hasNumberExitCode(error) ? { exitCode: error.exitCode } : {}),
    },
  };
}

function normalizeFileNotFoundError(error: Error): AshibaErrorDetails {
  return {
    code: 'ASHIBA_FILE_NOT_FOUND',
    message: error.message,
    cause: 'Ashiba could not find a required file or directory.',
    nextAction: 'Check the path, generate the missing artifact, or pass the correct --root-dir/--ddl-dir option.',
    details: {
      sourceCode: 'ENOENT',
      ...(hasStringPath(error) ? { path: error.path } : {}),
      ...(hasStringSyscall(error) ? { syscall: error.syscall } : {}),
    },
  };
}

function hasNumberExitCode(error: Error): error is Error & { exitCode: number } {
  return 'exitCode' in error && typeof error.exitCode === 'number';
}

function hasStringPath(error: Error): error is Error & { path: string } {
  return 'path' in error && typeof error.path === 'string';
}

function hasStringSyscall(error: Error): error is Error & { syscall: string } {
  return 'syscall' in error && typeof error.syscall === 'string';
}
