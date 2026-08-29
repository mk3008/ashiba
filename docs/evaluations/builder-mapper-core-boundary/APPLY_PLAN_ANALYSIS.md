# ApplyPlan Analysis

## Consumer census

`applyPlan` is public through `packages/cli/src/ddl-diff/contracts.ts` and is
emitted by `ddl migration generate`. Current repository consumers are command
output, CLI/tests, a Support Inbox exercise, and current migration guidance.
No current application runtime, standard `pnpm verify`, CI gate, or identified
machine consumer depends on it.

## Reproduced consistency control

For the nullable `resolved_at` addition fixture, the current CLI output in
`evaluation/migration/add-resolved-at.json` is:

| Representation | Actual result |
| --- | --- |
| Generated SQL | `ALTER TABLE "tickets" ADD COLUMN "resolved_at" timestamptz NULL;` |
| Summary | `add_column` |
| applyPlan operations | `drop_table_cascade`, `recreate_table`, `create_table` |
| Destructive risks | `semantic_constraint_change: public.tickets` |
| Operational risks | none |

The generator did not produce destructive SQL for this fixture. `applyPlan`
instead models the normalized table definition change as conceptual
drop/recreate, and the separately-derived risk output does not report a table
rebuild or full copy. This is a metadata consistency and double-authority
concern, not evidence that the SQL generator emitted a destructive migration.

## Decision

**ApplyPlan: REMOVE.** It has no identified independent machine consumer or
required Builder Mapper proof, and it can contradict the generated SQL a human
is meant to review. Retaining it would require an independent, precise
operation-model and compatibility commitment. If migration generation is
removed as recommended, retaining a second migration representation has even
less durable value.

Before any implementation, a bounded follow-up should confirm whether an
external consumer exists. If a review representation must remain, derive it
from the same operation model as generated SQL rather than maintain a parallel
conceptual plan.
