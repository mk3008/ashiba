# Ashiba Architecture Fitness / Practicality Evaluation

## Decision

**FIT-WITH-CONCERNS.** The current architecture is an acceptable baseline for
the next application phase. Realistic reads, changes, native-driver execution,
and application-owned transactions work without recreating a removed runtime
framework. The decision carries two explicit concerns: finite dynamic sorting
can produce a large visible SQL review surface, and optional change-safety tools
are situational rather than a default workflow.

Starting SHA: `892df4fbe887a8f216a5ed19cc9aab6e8e00a4a`. This is an evaluation
only: product code, Scope, Golden Path, and DBMS positioning are unchanged.

## Architecture and task result

```text
canonical SQL -> deterministic binding metadata -> bindNamedParameters
-> application-owned native driver -> optional PostgreSQL contract
-> application/live tests
```

| Task | Result | Practical finding |
| --- | --- | --- |
| A read | pass | Visible JOIN query, four named inputs, nullable filter, results, and pagination generated metadata then called native `pool.query`. |
| B change | pass | `locale` added a result/filter/input; `model-gen --check` rejected intentionally stale metadata. |
| C sort | concern | Ticket Queue's small allowlist is natural; Support Inbox's 337-line CASE ordering is safe but materially broadens review. |
| D transaction | pass | Ticket Queue verified direct pg transaction/rollback and native named binding. |
| E schema | mixed | DDL lint caught a missing column; query uses reported AST impact; an additive fixture migration rendered recreate/drop risk. |
| F failures | pass | Binding, freshness, DDL, AST, contract, and rollback controls detected their bounded failures. |

See [TASK_MATRIX.md](TASK_MATRIX.md), [FAILURE_DETECTION_MATRIX.md](FAILURE_DETECTION_MATRIX.md), and `evaluation/` for reproducible fixtures.

## Strongest evidence

Ticket Queue verified a normal live PostgreSQL boundary: it generated/checks
binding artifacts, binds named values, executes directly through `pg`, owns
BEGIN/COMMIT/ROLLBACK, and verified four contracts plus three negative controls.
A bounded independent AI lane also produced a correct visible read-query shape on
its initial attempt from current source patterns, without a runtime executor.

The concern is bounded, not hidden: broad finite sorting can be a 337-line CASE
SQL surface. Prefer small reviewed allowlists or visible variants; do not restore
the removed runtime package based on this one consumer.

## Optional capability practicality

| Capability | Result |
| --- | --- |
| query uses | situationally useful: AST-first impact inspection found four high-confidence `public.tickets` matches across seven Support Inbox catalogs. It requires the intended QuerySpec/canonical layout. |
| DDL-backed lint | clearly useful: fail-closed mechanical table/column/literal checks; fixture mismatch failed before execution. |
| DDL migration generate | situationally useful: deterministic risk/review evidence, not migration application; additive fixture rendered recreate/drop risk. |
| sql-resource snapshot/compare | situationally useful, limited current use: live mutation matrix is strong, but no active application/CI consumer exists. |
| PostgreSQL contract | clearly useful where opted in: live Ticket Queue checks caught stale SQL and false type declarations. |

Detailed ownership-in-practice is in [OPTIONAL_CAPABILITY_PRACTICALITY.md](OPTIONAL_CAPABILITY_PRACTICALITY.md).

## Trade-offs, limitations, and follow-up

Application code intentionally owns finite sort policy, transactions, logging,
and mapping. Optional tools stay outside default verification. Evidence strength
is **medium**: it includes current consumers, generated fixtures, focused
fail-closed controls, live SQL-resource testing, and live Ticket Queue
transaction/contract verification.

Limitations: one clean-room read fixture, one bounded AI lane rather than a fresh
external benchmark, no production workload measurement, and no live Support
Inbox run. Ticket Queue's own compose start was blocked by exhausted Docker
address pools; an existing isolated evaluation PostgreSQL service was used after
checking target tables were absent, and temporary tables were removed.

Reconsider only if independent applications repeatedly reimplement a removed
runtime abstraction, broad CASE sorting becomes recurring structural friction, or
sql-resource remains unused despite its maintenance cost. No implementation work
is authorized here.

## Invariants

- Scope change required: **no**
- Golden Path changed: **no**
- Product code changed: **no**
- DBMS positioning changed: **no**
- Temporary resources: **cleaned**
