# Model Gen Durable Ownership Evaluation

## Decision question

When AI commonly creates and changes SQL, TypeScript, and tests, does Ashiba's
`model-gen` CLI, generated binding artifact, source hash, and freshness
lifecycle add durable value beyond the named-parameter compiler/binder?

## Outcome

**Decision: REDUCE** the model-generation workflow from the standard/core
AI-first path. **Independent decision: KEEP** the named-parameter
compiler/binder primitives.

The additional Arm C evidence changed the earlier provisional KEEP conclusion.
The fresh agent received neither model-gen nor a generated-artifact/freshness
workflow and still produced a strict TypeScript native-`pg` application that
passed the same runner-owned PostgreSQL acceptance. It loaded visible `.sql`,
compiled once at controlled initialization, cached bindings in application
memory, and bound values with the retained primitive.

The meaningful distinction is not generator versus manual generator. It is
**static duplicate state versus no duplicate state**. A model-gen check is a
strong deterministic proof after an application chooses a committed static
binding module. Arm C shows an application need not make that choice.

## Arms and equal behavioral authority

All three arms used the frozen ticket DDL and behavior: strict TypeScript,
visible canonical SQL, named binding, hostile-value isolation, missing/unused
rejection, nullable filters, four finite reviewed sorts with stable ties,
pagination, get, native transaction, and injected-audit rollback. Final
behavior was judged by runner-owned PostgreSQL oracles, not agent self-report.

| Measure | A — current workflow | B — primitive static artifact | C — primitive no artifact |
| --- | --- | --- | --- |
| Ashiba input | CLI + named package | named package only | named package only |
| Binding state | model-gen committed module | application-owned committed module | controlled in-memory cache |
| source hash / generic check | yes | no | unnecessary |
| Fresh Agent completed initial acceptance | existing PR #106 reference | yes | yes |
| strict TS / candidate tests / live oracle | pass | pass | pass |
| nullable SQL repair | one live-only cast repair | one live-only cast repair | one live-only cast repair |
| semantic source-only drift | check fails; stale runtime is old if skipped | stale runtime is old | new SQL is compiled and used |
| parameter-shape source-only drift | check fails before build/test/DB | stale binding cannot know new name | current binder rejects missing name before DB |

Arm B's original clean room was removed after the first evidence as planned.
Its additional semantic row is a controlled reconstruction of its observed
static-artifact mechanism, not a claim of a second Fresh Agent run. This is
explicit in `ADDITIONAL_DRIFT_CONTROLS.md`.

## Strongest evidence

### Conditional KEEP evidence

For a static artifact, `model-gen --check` deterministically rejected both a
parameter-preserving semantic SQL edit and a parameter-shape edit before build,
tests, or database use. This is valuable source/artifact proof. The earlier
comment-only control remains evidence of exact source identity only; it is not
the strongest runtime-safety evidence.

### REDUCE evidence

Arm C eliminated the duplicate artifact and therefore the drift lifecycle. It
still retained direct compiler/binder protection and the entire PostgreSQL
behavioral acceptance. The controlled direct compiler excluded a newly filtered
`deleted` row, while stale static bindings in A/B returned it. With a new
parameter, fresh direct compilation made the unchanged caller fail
`ASHIBA_MISSING_PARAMETER` before a DB call.

The controlled-startup compiler measurement found a median of 0.0529 ms for
the eight-query VSA set and 2.2286 ms for 1000 synthetic queries on Node
22.14.0. This is bounded feasibility evidence, not a throughput claim.

## Current consumers and retained helper boundary

VSA and layered references, Support Inbox generated artifacts, and consumer /
tutorial / distribution verification currently use model-gen. This demonstrates
the migration surface but does not itself justify retention. The Ticket Queue
reference already demonstrates application-owned compiler use. Transfer is
detached experimental evidence and is not counted as Golden Path evidence.

`model-gen.ts` also hosts helper exports used by SQL-resource and standalone
PostgreSQL contract. Those optional-capability helpers are not generated binding
fields and are outside this decision; a future removal must separate them.
See `CURRENT_OWNERSHIP_CENSUS.md`.

## Maintenance and education result

The generated workflow requires Ashiba to own a CLI/API, exact artifact format,
three driver renderings, source hash/check semantics, compatibility, docs,
AGENTS/prompt rules, examples, CI/distribution checks, and migrations. It also
requires every user/agent to learn when to generate and check.

Arm C needs only the compiler/binder concept, visible SQL, an
application-controlled SQL-loading/initialization choice, native driver use,
and ordinary tests. It has no generated files, no committed duplicate state, no
source hash, no freshness CI command, and no artifact repair step. It does not
make static artifacts invalid; it removes the reason Ashiba must prescribe one.

## Scope and follow-up

No product code, public API, Scope, Golden Path, or current documentation is
changed in this evaluation. Scope and Golden Path change would be required only
for a follow-up implementation. That work should:

1. define the supported direct-compile application boundary and SQL-loading
   choices without adding a new runtime framework;
2. inventory/migrate existing model-gen users and distribution verification;
3. preserve compiler/binder and selected-driver support;
4. re-home SQL-resource/PostgreSQL-contract helper dependencies; and
5. decide whether a clearly optional static-artifact convenience remains public.

## Evidence strength, limits, and reconsideration

Evidence strength is **medium**: three bounded arms, shared live authority,
semantic/parameter drift controls, and a measured no-artifact startup model.
Limits include one Arm C Fresh Agent, PostgreSQL-only direct live evidence, no
deployment/bundling matrix, and unavailable token/credit telemetry. A future
decision should reconsider only with material selected-driver/distribution
constraints or repeated no-artifact safety/review failures.

See `DECISION.md`, `ARM_C_NO_COMMITTED_ARTIFACT.md`,
`ADDITIONAL_DRIFT_CONTROLS.md`, `COMPILE_OVERHEAD.md`, and `raw-results.json`.
