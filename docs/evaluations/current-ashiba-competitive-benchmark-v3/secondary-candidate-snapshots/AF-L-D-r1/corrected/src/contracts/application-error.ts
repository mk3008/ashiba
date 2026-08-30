export type ApplicationErrorCode = 'VALIDATION' | 'NOT_FOUND' | 'APPLICATION_CLOSED';

export function applicationError(code: ApplicationErrorCode, message: string): Error & { code: ApplicationErrorCode } {
  const error = new Error(message) as Error & { code: ApplicationErrorCode };
  error.code = code;
  return error;
}
