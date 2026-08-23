# Minimum runtime product slice

## Context

PR #64 established the runtime-mechanism boundary and observed generic-plan
benefit from precomputed optional-predicate subtraction. PR #65 repaired the
product compiler's nested PostgreSQL block-comment handling, removing the
registered lexical-corpus blocker. This slice applies that evidence to the
product runtime surface.

## Candidate B

Candidate B is `preparePostgresQuery(queryArtifact, params, options)`:

```ts
const prepared = preparePostgresQuery(query, params, options);
await client.query(prepared.sql, prepared.values);
```

It validates the canonical-source hash, maps generated `orderedNames` to
values, applies precomputed optional edits and placeholder renumbering, and
composes a reviewed finite sort at a generated coordinate. It neither lexes nor
parses runtime SQL.

The execution artifact is the PostgreSQL binding generated from canonical SQL:
`sourceHash`, positional `sql`, `orderedNames`, optional-edit metadata, and an
optional sort insertion coordinate. Canonical SQL remains the visible SSOT;
the artifact is only an execution derivative.

## Two product alternatives

| Alternative | Decision |
| --- | --- |
| `prepare(...)` then application `client.query(...)` | Preferred. It is sufficient for SQL safety and keeps pool, client acquisition, transactions, retry policy, and logging application-owned. |
| `execute(client, ...)` | Retained only as the existing compatibility shell for applications that elect shared observation/masking. It delegates to `preparePostgresQuery`; it is not required for named binding. |

## Responsibility disposition

| Responsibility | Disposition |
| --- | --- |
| source hash, ordered names, optional edits, finite sort splice | kept in Candidate B |
| native pg call, pool/client, transaction, retry and business policy | moved/kept application-owned |
| observation, masking, driver profile, retry classification | optional utilities; not required by `prepare` |
| runtime lexical/parser/AST analysis | removed from the product execution path (none added) |
| missing selected parameter | kept: prevents accidental undefined-to-NULL binding |
| unused parameter rejection | moved to an opt-in `strictParameterNames` policy; compatibility execution retains strict behavior, while Candidate B does not require it |

## Current outcome and limits

`preparePostgresQuery` is now the preferred public name; the previous
`compilePostgresQuery` remains a deprecated pre-1.0 compatibility alias.
The direct product regression proves positional SQL plus ordered values can be
sent to a native pg-compatible client and that stale canonical SQL is rejected.
The Transfer dogfood feature executor now uses this path directly, preserving
its generated query source and application-owned native client invocation.

Supporting local reproduction reran the frozen 200k-row O1/O2/O3 evaluator in
an isolated temporary copy. All nine states passed in `auto`,
`force_custom_plan`, and `force_generic_plan`. In the representative
`force_generic_plan` / `multiple-selective` case, O2 retained the recorded
`Limit → Sort → Bitmap Heap Scan → Bitmap Index Scan` shape with 202 hit and 0
read blocks, versus O1's 951 hit and 69 read blocks. `preparePostgresQuery`
uses that existing precomputed-subtraction mechanism; it adds no SQL analysis
or alternative plan construction.

This intentionally narrow slice does not yet migrate the PR #63 reference
fixture or every starter application, nor does it remove the optional wrapper.
Those changes require preserving the fixture's complete behavior and the
representative generic-plan comparison as a separate, reviewable migration
slice.
