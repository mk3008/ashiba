import { describe, expect, test } from 'vitest';
import { AshibaUserError, formatAshibaError, normalizeAshibaError, parseAshibaErrorMode } from '../src/error-format.js';

describe('CLI error formatting', () => {
  test('formats human errors with cause and next action', () => {
    const error = new AshibaUserError({
      code: 'ASHIBA_EXAMPLE',
      message: 'Example failed.',
      cause: 'The input was not valid.',
      nextAction: 'Fix the input and retry.',
    });

    expect(formatAshibaError(error, 'human').text).toBe(
      ['Error: Example failed.', 'Code: ASHIBA_EXAMPLE', 'Cause: The input was not valid.', 'Next: Fix the input and retry.', ''].join('\n'),
    );
  });

  test('formats AI errors as structured JSON', () => {
    const formatted = formatAshibaError(
      new AshibaUserError({
        code: 'ASHIBA_EXAMPLE',
        message: 'Example failed.',
        details: { field: 'name' },
      }),
      'ai',
    );

    expect(JSON.parse(formatted.text)).toEqual({
      error: {
        code: 'ASHIBA_EXAMPLE',
        message: 'Example failed.',
        cause: 'Ashiba received an error without structured cause metadata.',
        nextAction: 'Use the error message and stack trace to identify the failing command or package, then add an Ashiba-specific cause and next action for this error path.',
        details: { field: 'name' },
      },
    });
  });

  test('normalizes plain errors with cause and next action fallbacks', () => {
    expect(normalizeAshibaError(new Error('Plain failure.'))).toEqual({
      message: 'Plain failure.',
      cause: 'Error',
      nextAction: 'Use the error message and stack trace to identify the failing command or package, then add an Ashiba-specific cause and next action for this error path.',
    });
  });

  test('normalizes package errors with structured cause and next action', () => {
    const error = Object.assign(new Error('Package failure.'), {
      code: 'ASHIBA_PACKAGE_FAILURE',
      causeText: 'The package rejected an unsupported state.',
      nextAction: 'Regenerate the artifact and retry.',
      details: { artifact: 'query-model' },
    });

    expect(normalizeAshibaError(error)).toEqual({
      code: 'ASHIBA_PACKAGE_FAILURE',
      message: 'Package failure.',
      cause: 'The package rejected an unsupported state.',
      nextAction: 'Regenerate the artifact and retry.',
      details: { artifact: 'query-model' },
    });
  });

  test('parses valid modes and rejects invalid modes', () => {
    expect(parseAshibaErrorMode(undefined)).toBe('human');
    expect(parseAshibaErrorMode('ai')).toBe('ai');
    expect(() => parseAshibaErrorMode('json')).toThrow(AshibaUserError);
  });

  test('normalizes commander argument errors with actionable guidance', () => {
    const error = Object.assign(new Error("error: unknown command 'wat'"), {
      code: 'commander.unknownCommand',
      exitCode: 1,
    });

    expect(normalizeAshibaError(error)).toEqual({
      code: 'ASHIBA_UNKNOWNCOMMAND',
      message: "error: unknown command 'wat'",
      cause: 'The command line arguments did not match an Ashiba command contract.',
      nextAction: 'Run the command with --help to inspect the supported arguments and options.',
      details: {
        sourceCode: 'commander.unknownCommand',
        exitCode: 1,
      },
    });
  });

  test('normalizes file-not-found errors with path repair guidance', () => {
    const error = Object.assign(new Error("ENOENT: no such file or directory, open 'missing.sql'"), {
      code: 'ENOENT',
      path: 'missing.sql',
      syscall: 'open',
    });

    expect(formatAshibaError(error, 'ai').data).toEqual({
      code: 'ASHIBA_FILE_NOT_FOUND',
      message: "ENOENT: no such file or directory, open 'missing.sql'",
      cause: 'Ashiba could not find a required file or directory.',
      nextAction: 'Check the path, generate the missing artifact, or pass the correct --root-dir/--ddl-dir option.',
      details: {
        sourceCode: 'ENOENT',
        path: 'missing.sql',
        syscall: 'open',
      },
    });
  });
});
