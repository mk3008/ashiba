# Arm A — current workflow

## Input and provenance

Arm A reuses the strict TypeScript VSA release evidence from PR #106 and runs a
new bounded maintenance exercise in a disposable copy of that reference. The
copy used packed `@ashiba-ts/cli` and `@ashiba-ts/named-parameters` packages;
it did not change repository product code.

The initial VSA evidence already passed strict TypeScript, metadata generation
and freshness, candidate tests, and a runner-owned PostgreSQL oracle. Its
fresh-agent provenance is recorded in
`docs/evaluations/release-readiness/VSA_TYPESCRIPT_RERUN.md`.

## Maintenance exercise

Instruction:

> Extend the ticket get query with an optional `status` guard. When status is
> omitted or null, `get(ticketId)` must retain its existing behavior. When a
> status is supplied, return the ticket only when it matches. Keep the current
> application architecture and the established metadata-generation workflow.

The worker changed the canonical `get.sql`, generated `get.generated.ts`, the
application method signature/binding values, and focused tests.

## Drift result

After the canonical SQL edit and before regeneration,
`npm run check:generated` failed with exit status 1 and identified
`src/tickets/generated/get.generated.ts` as stale. Running `npm run generate`
regenerated the artifact; a subsequent freshness check passed. This is the
specific deterministic benefit of the current workflow: a source/artifact
mismatch is rejected before compilation, test execution, or database access.

## Correctness result

The first live pass exposed an independent PostgreSQL SQL correctness issue:
the new nullable guard had an untyped `$2 is null` parameter (SQLSTATE 42P08).
One bounded repair changed it to `cast(:status as text) is null`; the generated
SQL then used `cast($2 as text) is null`.

This distinguishes two authorities:

- freshness accurately detected the stale generated binding but could not
  validate the new SQL's PostgreSQL type resolution; and
- the live oracle detected that semantic/database concern.

After repair, generation, freshness, strict typechecking, six focused tests,
and the evaluation-specific runner-owned PostgreSQL oracle passed. The oracle
checked the optional status guard, filters, four finite reviewed sort modes and
stable ties, pagination, hostile binding, missing/unused binding rejection,
and transaction rollback.

## Arm A surface for this change

| Measure | Observed result |
| --- | --- |
| Application/SQL files changed | 4 (`get.sql`, generated module, application, tests) |
| Required Ashiba workflow commands | `generate`, `check:generated` |
| Generated artifact changed | 1 |
| Initial deterministic failure | stale output, before build/test/DB |
| Code repair | 1, for PostgreSQL nullable-parameter typing (not freshness) |
| Live verification | passed after repair |
| Agent instruction dependency | needed the established generation/freshness workflow |

The `model-gen` workflow did not prevent the nullable SQL error. It did make
the artifact mismatch explicit and mechanically repairable.
