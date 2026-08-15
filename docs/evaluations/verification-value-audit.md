# Verification Value Audit

This audit was run from checkpoint
`33f1cb0f97aac459204bfc5b2e0b2a25e19f90fb` on
`codex/verification-value-audit`. It asks which Ashiba verification layers
add defect detection, not how many tests they contain.

Labels used below:

- **Observed**: reproduced by repository inspection or an executed check.
- **Inference**: a conclusion from observed results.
- **Hypothesis**: plausible, but not measured in this audit.

## Decision

**Observed:** persisted synthetic mapping cases added no first detection across
the 25-category mutation matrix. They did not execute the canonical query or
the generated row mapper. Static/TypeScript/PostgreSQL-derived checks detected
the type and freshness mutations first, while human-owned behavior assertions
detected semantic SQL and mapper mutations.

The adopted model is therefore:

1. Generate only the runtime SQL snapshot and query metadata by default.
2. Check SQL parameters, result columns, types, nullability, and PostgreSQL
   contracts directly from canonical SQL and DDL/PG evidence.
3. Scaffold SQL logic tests explicitly, only for behavior whose risk merits
   executable examples.
4. Use ZTD only when the exact canonical SQL is supported and the obligation
   does not require physical schema behavior.
5. Use real-schema/data-backed tests for constraints, transactions, functions,
   locking, planner behavior, and valid SQL that ZTD cannot execute faithfully.

No offline/ZTD/real-schema auto-selection planner was added. The observed
boundary is useful as human guidance, but one valid PostgreSQL array expression
already produced a ZTD false rejection, so automatic classification is not yet
stable enough.

## Baseline

| Item | Observed baseline |
|---|---|
| Base branch / SHA | `codex/checkpoint-integration` / `33f1cb0f97aac459204bfc5b2e0b2a25e19f90fb` |
| Isolated worktree | Yes; the user's dirty worktree was kept separate |
| Full `pnpm verify` | Passed in 221.1 s; CLI 186 passed/7 skipped, dogfood 28 passed, example 17 passed/30 skipped |
| Explicit live command without a URL | Exited 0 in 3.1 s while every live test skipped; this was a false-green |
| Disposable PostgreSQL 18 live gate | 10 passed in 6.9 s (3 adapter + 7 CLI) |
| Dogfood tests | 28 passed in 5.7 s |
| Example persisted mapping wrappers | 7 passed in 1.7 s |
| Full example DB-backed route file | Existing failure: 15 requests returned 503 because application sort profiles requested keys absent from the generated source-visible safe-sort whitelist |

The explicit live command now fails before Vitest when neither
`ASHIBA_TEST_DATABASE_URL` nor `ASHIBA_POSTGRES_DATABASE_URL` is set.
Ordinary workspace tests may still skip environment-dependent live suites.

## Verification Graph and Ownership

| Surface | Ownership / source of truth | What it proves | What it does not prove | Consumer / refresh |
|---|---|---|---|---|
| Canonical `.sql` | Authored; source of query behavior | Reviewable SQL intent and executable text | DB compatibility, TypeScript contract, data semantics by itself | Application, SQL client, all analyzers; edited directly |
| `generated/query.sql.ts` | Generated from canonical SQL | Runtime snapshot freshness when drift-checked | SQL correctness | Driver/query boundary; query refresh |
| `generated/query.meta.ts` | Generated from SQL/DDL and optional PG contract | Source hash, params, result shape, optional-condition and finite safe-sort metadata | Business meaning or persisted-state behavior | Driver and project checks; query refresh |
| `query.ts` Params/Result | Application-editable contract | TypeScript caller/consumer boundary; compile-time use | PostgreSQL reality unless compared with SQL/PG evidence | Application and compiler; human/AI edit |
| PostgreSQL-derived contract | Generated from PREPARE/catalog evidence | DB parameter/result types, names/order, OID-free type identity, selected driver profile | General result nullability, JSON object shape, data-dependent semantics | Contract/project check; explicit DB-backed refresh |
| SQL Resource contract | Generated language-neutral metadata plus separate executable SQL | Fleet identity, portability, source hash, before/after DB compatibility | Migration apply, business result semantics | Non-TypeScript consumers and schema-compatibility checks |
| `boundary-ztd-types.ts` | Generated only after explicit logic-test scaffold | Fixture table/type boundary for selected canonical SQL | Query semantics | ZTD logic harness; tests check/fix |
| `logic.case.ts` | Human/AI-authored and never overwritten | The stated row/value/order behavior | Unstated behavior, constraints, transactions, planner effects | Selected ZTD or real-schema test |
| `*.boundary.ztd.test.ts` | Generated only after explicit logic-test scaffold | Executes selected human cases through the fixed harness, with no physical setup | PostgreSQL features the rewrite cannot preserve | Vitest/ZTD; tests check/fix |
| Real PostgreSQL tests | Human-authored | PostgreSQL preparation/execution, schema/data, driver and integration behavior stated by each test | Unasserted production behavior | Live/functional gates |
| Removed `mapping.cases.ts` | Generated synthetic SELECT probes | Representative synthetic value comparison | Canonical query, real mapper, SQL logic, constraints, state | No longer generated |
| Removed `analysis.json` / `TEST_PLAN.md` | Repeated generated intermediates/explanation | No first detector beyond direct SQL inference and command output | Any runtime or semantic behavior | No longer generated |

## Type-Safety Responsibility

| Obligation | First decisive mechanism after the audit | Important limit |
|---|---|---|
| Parameter DB type | PostgreSQL-derived contract; DDL/static evidence when resolvable | Casts and overloaded functions may require PostgreSQL |
| Result DB type and column name/order | PostgreSQL-derived contract | A DB type does not prove application JSON shape |
| Nullability | SQL/DDL proof where possible; otherwise conservative warning/nullable contract | Prepared statement metadata does not generally prove result nullability |
| Scalar/array, enum, domain | PostgreSQL-derived recursive type identity | Domain constraints still require real schema/data |
| bigint/numeric driver value | Driver profile recorded by PostgreSQL-derived contract | Custom parsers deliberately degrade to `unknown` |
| Driver value to TypeScript boundary | Contract check plus TypeScript | Same-typed semantic swaps remain possible |
| DTO/query boundary | TypeScript plus SQL/contract comparison | TypeScript alone cannot inspect database reality |
| Row-mapper transformation | Targeted application behavior test | The removed synthetic probes never invoked the real mapper |
| Generated freshness | Source hashes and deterministic project/contract checks | A fresh artifact can still encode wrong business logic |
| Schema drift | SQL Resource compare and/or refreshed PostgreSQL-derived contracts | Neither applies migrations |

## Mutation Matrix

Layers:

- **A**: static/offline checks + TypeScript + PostgreSQL-derived contract.
- **B**: A + persisted synthetic generated mapping cases.
- **C**: A + targeted human-owned application/mapper assertion.
- **D**: A + selected human logic cases executed through ZTD.
- **E**: real-schema/data-backed PostgreSQL.

| # | Mutation | First decisive detector | Observed evidence |
|---:|---|---|---|
| 1 | Parameter type mismatch | A | Offline contract tests and live PostgreSQL parameter metadata |
| 2 | Result type mismatch | A | Contract check compared inferred/PG result type with editable result |
| 3 | Nullable/non-null mismatch | A | Both proved directions tested; unknown remains warning-level |
| 4 | bigint treated as number | A | Live node-postgres profile recorded bigint as string |
| 5 | numeric representation | A | Live contract kept numeric DB identity separate from string driver value |
| 6 | Scalar/array mismatch | A | Live array parameter/result contract |
| 7 | Enum mismatch | A | Live enum identity and SQL Resource enum mutation |
| 8 | Domain mismatch | A | Live base/domain identity and domain compatibility review |
| 9 | JSON overclaim | A | JSON/JSONB remains `unknown`; false object claims rejected |
| 10 | Result alias/order mismatch | A | SQL result names/order compared with editable result contract |
| 11 | Stale generated metadata | A | Source-hash/query-model drift checks |
| 12 | Stale SQL Resource | A | Resource source hash and before/after fleet comparison |
| 13 | Driver profile mismatch | A | Persisted PG contract/profile mismatch |
| 14 | Mapper transformation swap | C | Same-typed id/name swap passed typecheck, then failed the dogfood boundary test |
| 15 | Optional null-guard inversion | E | Complex real-schema test returned 0 instead of 10 |
| 16 | WHERE equality changed to inequality | E | Open-ticket expectation returned the complement set |
| 17 | JOIN result behavior | D | Canonical get-ticket-detail fixture asserted joined customer/messages |
| 18 | LEFT JOIN changed to INNER JOIN | D | ZTD case lost the ticket with no messages |
| 19 | Aggregate value changed from tag slug to label | E | Real-schema row returned `請求` instead of `billing` |
| 20 | CASE rank changed | E | Real-schema row returned action rank 8 instead of 1 |
| 21 | Window order reversed | E | Latest message became the oldest message |
| 22 | Pagination limit off by one | E | Real-schema page returned 11 instead of 10 |
| 23 | Safe-sort contract mismatch | E | Existing route tests returned 503 for `action_required`; static checks did not reject the application-owned sort profile |
| 24 | Schema-only drift | A | 20 affected SQL Resource scenarios plus one unchanged control; refreshed contract caught DDL type drift |
| 25 | Function return change | A | Live SQL Resource comparison classified the return contract change |

First incremental detector count:

| Layer | First detections |
|---|---:|
| A | 15 |
| B | 0 |
| C | 1 |
| D | 2 |
| E | 7 |
| Unobserved | 0 |

The 20 affected SQL Resource scenarios covered rename/drop, widening and
breaking types, both nullability directions, aggregate/result change, function
return, view JOIN shape, compatible/incompatible parameter changes, arrays,
enum append/rename, domain constraint change, JSON to JSONB, and deleted
table/view/function. An unchanged external query was the control.

## Persisted vs Ephemeral vs No Mapping Probe

| Measure | Persisted synthetic probe | Ephemeral synthetic probe | No synthetic probe (adopted) |
|---|---:|---:|---:|
| Unique first detections in 25 mutations | 0 | 0 (same probe logic; inference) | Baseline detection retained by A/C/D/E |
| Persisted generated test files per measured query | 4 of 6 generated/support files were mapping-analysis artifacts | 0 | 0 |
| Measured generated surface per ordinary query | 6 files / 301 lines / 8,967 bytes | Repository cost 0; runtime not separately timed | 2 files / 134 lines / 3,678 bytes |
| Regeneration commands in change loop | 2 | At least 2 including transient generation | 1 |
| Stale test-artifact failure mode | Yes | No persisted staleness | No |
| Canonical SQL or real mapper executed | No | No | Logic tests do, only when selected |

**Inference:** ephemeralizing a probe with zero incremental detection preserves
its execution cost without creating a useful guarantee. It was therefore
removed rather than ephemeralized. No token-saving claim is made; only
persisted source files/lines/bytes avoided were measured.

## Change Amplification

The same disposable imported query was changed in nine ways. Counts include
the canonical edit and any required editable contract change.

| Change | Files before → after | Generated files before → after |
|---|---:|---:|
| Result add | 6 → 4 | 4 → 2 |
| Result remove | 6 → 4 | 4 → 2 |
| Result type | 4 → 3 | 3 → 2 |
| Nullability | 4 → 2 | 3 → 1 |
| Parameter add | 6 → 4 | 4 → 2 |
| Alias | 6 → 4 | 4 → 2 |
| WHERE logic only | 3 → 3 | 2 → 2 |
| JOIN | 6 → 4 | 4 → 2 |
| Schema-only type drift | 1 → 1 | 1 → 1 |

Mean changed files fell from 4.67 to 3.22 (-31%). Mean generated changed
files fell from 3.22 to 1.78 (-45%). Regeneration fell from two commands to
one. On the ordinary-query fixture, generated/support surface fell from six to
two files (-67%), 301 to 134 lines (-55%), and 8,967 to 3,678 bytes (-59%).

Across the checked-in dogfood/example query-test fleet, the affected surface
fell from 66 files / 3,388 lines / 127,644 bytes to 3 files / 190 lines /
5,440 bytes. The remaining three files are one selected wrapper, its generated
fixture types, and 125 lines of human-owned logic cases; none is a synthetic
mapping case, repeated analysis JSON, or generated test plan.

## Logic Test Selection

Add a logic test when a same-typed change can alter rows, values, order, or
state and the behavior matters enough to name:

- optional conditions or non-trivial NULL semantics;
- JOIN direction/cardinality;
- aggregates, CASE, windows, pagination, JSON construction;
- locking/concurrency, mutation row counts, transactions, or constraints;
- a real mapper transformation that can swap or reshape same-typed values.

Do not scaffold one by default for a direct lookup or straightforward CRUD
query whose useful obligations are already parameter/result/schema contracts.
Escalate to real schema when the obligation depends on physical objects,
constraints, triggers/functions, transactions/locking, planner behavior, or a
PostgreSQL construct the ZTD rewrite cannot preserve.

## ZTD vs Real Schema

| Measure | Selected ZTD query | Selected real-schema query |
|---|---:|---:|
| Canonical SQL | Exact get-ticket-detail SQL | Exact list-tickets SQL |
| Human cases/assertions | 2 cases | 1 grouped scenario covering filters, aggregate, CASE, window, pagination |
| Physical table creation | 0 | 5 tables after one schema reset |
| Migration/schema setup | 0 | DDL applied once by seed setup |
| Observed passing wall time | 0.65 s final rerun (1.39 s initial run) | 0.68 s file run / 0.22 s test work |
| Detected controlled logic mutations | JOIN/LEFT-INNER and row ordering | optional guard, WHERE, aggregate, CASE, window, pagination |
| False rejection | Valid `cast(array[] as text[])` in the complex query | None in the selected scenario |

ZTD did not win wall time on this small local fixture. Its measured value was
zero physical setup and isolation from shared table state, not speed.
Real-schema execution is mandatory fallback for the array-expression false
rejection and for physical-schema obligations. Parallel-conflict rate was not
measured, so no claim is made.

## Post-change Verification

| Check | Final observed result |
|---|---|
| Full `pnpm verify` | Passed in 195.5 s, including typecheck, build, project check, all workspace tests, docs, consumer install, Docker tutorial, and customer functional |
| CLI | 187 passed / 7 skipped; the added regression rejects a partial generated-only repair that leaves the human logic file missing |
| Dogfood | 24 passed; four default per-query wrappers were removed |
| Example ordinary run | 17 passed / 25 skipped; six default per-query wrappers were removed and one selected wrapper remains |
| Example and dogfood fast drift | Passed with 7 and 4 query contracts respectively; only the selected example query reported logic-test coverage |
| Selected ZTD logic test | Passed one wrapper containing two human cases; no physical table setup |
| Selected real-schema logic test | Passed the complex canonical list scenario against five physical tables |
| Explicit PostgreSQL live gate | Failed before Vitest with no URL; passed 10 tests with a disposable PostgreSQL 18 URL in 7.3 s |
| Canonical product SQL | No diff after every controlled mutation was restored |
| Promo source | Both changed Python render scripts passed `py_compile`; image binaries were not regenerated |

The final full-gate run was 25.6 s (11.6%) shorter than the 221.1 s baseline.
That is an observed end-to-end delta, not an attributed speed improvement:
package caches, Docker state, and machine load were not controlled. The
repository-surface and change-amplification reductions above are the causal
measurements used for the decision.

## sqlc Boundary Review

Official sqlc 1.31.1 documentation separates:

- `compile` for static SQL syntax/type checks;
- `generate` for source-code generation from schema and query SQL;
- `diff` for persisted generated-code freshness;
- `vet` for configured lint rules, optionally including DB prepare;
- Cloud-backed `verify` for old-query/new-schema compatibility.

Sources: [CLI](https://docs.sqlc.dev/en/latest/reference/cli.html),
[generate](https://docs.sqlc.dev/en/latest/howto/generate.html),
[CI/diff/verify](https://docs.sqlc.dev/en/stable/howto/ci-cd.html),
[vet](https://docs.sqlc.dev/en/latest/howto/vet.html), and
[DDL/migrations](https://docs.sqlc.dev/en/latest/howto/ddl.html).

Ideas adopted:

- keep generation separate from validation;
- use deterministic freshness checks for the artifacts that must persist;
- compare old queries with changed schema, rather than treating current
  generation success as complete compatibility proof.

Ideas not copied:

- language-bound generated application code as the portability boundary;
- Cloud upload as a requirement for schema compatibility;
- generated query contract test code. Ashiba's language-neutral SQL Resource
  and local PostgreSQL-derived contract already serve that boundary.

Both tools leave migration application to a migration tool/operator process.

## False Positives, False Negatives, and Remaining Work

- **Observed false positive/rejection:** ZTD rejected valid PostgreSQL
  `cast(array[] as text[])`; use real schema rather than rewriting product SQL.
- **Observed false-green fixed:** explicit live verification passed with all
  tests skipped when no URL was configured.
- **Observed existing product gap:** real route tests reject application sort
  profiles whose keys are not source-visible in the canonical `ORDER BY`.
  This predates the audit and remains separate application work.
- **Observed previous false-negative risk:** generated mapping comparison
  normalized string/number, Date/string, and boolean representations and did
  not invoke the actual row mapper.
- **Deliberate conservative signal:** unresolved result nullability remains a
  warning/nullable shape rather than a manufactured proof.
- **Not measured:** fresh-agent file reads, tool calls, tokens, retries, and
  parallel DB conflict rate. No AI-efficiency or token claim is made.
- **Human concept decision required:** the human-owned Concept Map still names
  generated mapper probes as a product-level safety concept. The audit proposes
  replacing that concept with layered contract safety plus selective behavior
  tests, but did not redefine the concept source without human approval.
- **P1 maintenance:** two historical patch-backed exercises still contain
  hunks for the removed mapper-probe baseline and already fail to apply to the
  current example for additional pre-existing drift. Regenerate those exercise
  solutions as a separate customer-artifact task rather than treating old
  patch text as current verification evidence.

Remaining priority triage:

- **P0: none.** The retained gates pass and no removed mechanism had an
  incremental first detection in the measured mutation matrix.
- **P1:** obtain human approval for the Concept Map terminology change;
  regenerate the two drifted exercise solution patches; reconcile the example
  application's sort profiles with the canonical safe-sort contract; and
  either support valid empty-array cast syntax in the ZTD rewrite or document
  the real-schema fallback as an explicit supported boundary.

## Adopted Repository Changes

- Stop generating/persisting synthetic mapping cases, repeated analysis JSON,
  generated test plans, and empty per-query test wrappers by default.
- Infer direct contract-check metadata from canonical SQL instead of
  `analysis.json`.
- Make logic tests explicit and selective; generate fixture types for every
  physical table used by the chosen SQL.
- Execute only human-owned logic cases in the ZTD wrapper.
- Retain a focused ZTD JOIN/LEFT-JOIN example and a focused real-schema complex
  SQL example.
- Add `feature contract check` as the primary command name while retaining
  `feature generated-mapper check` as a compatibility alias.
- Add `--test-command` as the primary `check --full` option while retaining
  `--mapper-test-command` as a deprecated alias.
- Make explicit PostgreSQL live verification fail when no live URL is set.
- Do not add an automatic execution-mode planner.
