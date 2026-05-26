import { AshibaUserError } from './error-format.js';

export function requiredCliValueError(label: string): AshibaUserError {
  return new AshibaUserError({
    code: 'ASHIBA_REQUIRED_CLI_VALUE',
    message: `${label} is required.`,
    cause: `The command requires ${label}, but the value was empty or missing.`,
    nextAction: `Pass ${label} with a non-empty value and rerun the command.`,
    details: { label },
  });
}

export function invalidCliInputError(
  code: string,
  message: string,
  nextAction: string,
  details?: unknown,
): AshibaUserError {
  return new AshibaUserError({
    code,
    message,
    cause: 'The command input did not satisfy an Ashiba command contract.',
    nextAction,
    ...(details !== undefined ? { details } : {}),
  });
}

export function astParseUserError(input: {
  code: string;
  message: string;
  reason: string;
  sqlKind: 'SQL' | 'DDL';
  operation: string;
}): AshibaUserError {
  return new AshibaUserError({
    code: input.code,
    message: input.message,
    cause: `${input.sqlKind} AST parsing failed while ${input.operation}. Cause: ${input.reason}`,
    nextAction: `Check whether the ${input.sqlKind} shape is valid and supported by rawsql-ts. If it is valid, treat this as an Ashiba/rawsql-ts parser or AST traversal issue to fix or report instead of adding a silent fallback.`,
    details: {
      operation: input.operation,
      reason: input.reason,
      sqlKind: input.sqlKind,
    },
  });
}
