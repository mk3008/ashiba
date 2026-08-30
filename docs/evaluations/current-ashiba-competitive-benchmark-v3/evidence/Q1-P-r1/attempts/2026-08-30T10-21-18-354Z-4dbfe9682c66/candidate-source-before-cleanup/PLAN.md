# Acceptance plan

## Source issue

Q1-P-r1 requires the frozen PostgreSQL investigation and JSON EXPLAIN API
through the Prisma 8 RC data path.

## Why it matters

The evaluator independently checks business rows and requires stable SQL and
bound-parameter evidence from both execution paths.

## Acceptance items and verification

1. `investigate` executes the supplied CTE, window, aggregate, JSON, array,
   and enum query through Prisma's raw-SQL lane. Verify with TypeScript
   compilation and the evaluator's live PostgreSQL checks.
2. `explain` executes the same parameterized query prefixed with
   `EXPLAIN (FORMAT JSON)` and returns PostgreSQL's JSON plan shape. Verify
   with TypeScript compilation and the evaluator's live PostgreSQL checks.
3. Both operations report the same normalized source SQL, executed SQL, and
   ordered parameters. Verify by inspection and evaluator comparison.
4. `close` is idempotent and blocks later workload operations with the
   required error code. Verify by inspection and evaluator lifecycle checks.

## Assumptions and working rules

- Prisma 8 is an RC/current-generation workflow, not GA.
- PostgreSQL-specific whole-query SQL and EXPLAIN require Prisma's documented
  `db.raw.sql` escape hatch. It remains the sole database path; no native
  `pg` client is imported.
- Runtime-provided schema names are safely double-quoted because identifiers
  cannot be bound parameters. Requested tag and tier remain bound values.
