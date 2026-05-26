export class AshibaDdlDiffError extends Error {
  readonly code:
    | 'ASHIBA_DDL_DIFF_AST_PARSE_FAILED'
    | 'ASHIBA_DDL_RISK_AST_PARSE_FAILED';
  readonly causeText: string;
  readonly nextAction: string;
  readonly details: { operation: string; reason: string };

  constructor(input: {
    code: AshibaDdlDiffError['code'];
    message: string;
    operation: string;
    reason: string;
  }) {
    super(input.message);
    this.name = 'AshibaDdlDiffError';
    this.code = input.code;
    this.causeText = `DDL AST parsing failed while ${input.operation}. Cause: ${input.reason}`;
    this.nextAction = 'Check whether the DDL shape is valid and supported by rawsql-ts. If it is valid, treat this as an Ashiba/rawsql-ts parser or AST traversal issue to fix or report instead of adding a silent fallback.';
    this.details = {
      operation: input.operation,
      reason: input.reason,
    };
  }
}
