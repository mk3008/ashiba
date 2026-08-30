# Model Gen Durable Ownership Evaluation

## Decision question

When AI commonly creates and changes SQL, TypeScript, and tests, does Ashiba's
`model-gen` CLI, generated binding artifact, source hash, and freshness
lifecycle still add durable value beyond the named-parameter compiler/binder?

## Outcome

**Decision: KEEP** the narrow model-generation workflow.

**Independent decision: KEEP** named-parameter compiler/binder primitives.

The two decisions are separate. The compiler/binder makes named execution safe
at the driver handoff; the workflow proves a committed precompiled binding has
not drifted from its canonical SQL. Neither establishes application semantics,
PostgreSQL type correctness, mapping correctness, or transaction adequacy.

## Strongest evidence

The current workflow rejected an intentionally stale binding module before
build, tests, or database access. The primitive-only fresh-agent arm achieved
the same final PostgreSQL behavior without the CLI, but independently
reintroduced a static binding module and did not create equivalent freshness
proof: a deliberate source-only drift passed its build while stale binding
content remained. A local equivalent is possible, but it recreates the
responsibility rather than eliminating it.

Both arms initially required an explicit PostgreSQL cast in nullable guards.
That common failure was detected by a live oracle, not by model generation. It
is evidence for a clear authority boundary, not a reason to overclaim the
workflow.

## What was evaluated

- current and historical implementation/consumer census;
- Arm A: existing PR #106 strict VSA workflow plus a new matched change;
- Arm B: fresh agent supplied only a packed named-parameter package and
  frozen application inputs;
- equal strict TypeScript, candidate-test, and PostgreSQL behavioral oracles;
- a source/artifact drift control; and
- maintenance, education, compatibility, and shared-helper dependencies.

See `CURRENT_OWNERSHIP_CENSUS.md`, `ARM_A_CURRENT_WORKFLOW.md`,
`ARM_B_PRIMITIVE_ONLY.md`, `ARM_A_B_COMPARISON.md`,
`MAINTENANCE_AND_EDUCATION_COST.md`, and `raw-results.json`.

## Current consumer and dependency result

Current VSA and layered references, Support Inbox artifacts, and the packed
consumer/customer/distribution verification paths use this workflow. Transfer
is detached experimental evidence and is not counted as Golden Path retention
evidence. A Ticket Queue reference already demonstrates an application-owned
direct-compiler artifact, so the evaluation does not mistake technical
possibility for durable ownership proof.

The current source file also contains result-contract helpers used by
SQL-resource and standalone PostgreSQL contract commands. They are not
generated binding fields and are outside this workflow decision.

## Maintenance and AI education trade-off

Keeping the workflow means continuing to own the CLI/API, three selected-driver
renderings, artifact format, source hash/check semantics, compatibility, docs,
prompts, examples, tests, and distribution checks. The primitive-only arm
shows AI does not require the CLI to write a working app. It does not show that
AI naturally preserves source/artifact synchronization; the agent instead
recreated the coupling and left its local check insufficient. Standardizing the
proof remains lower risk than treating an application-specific equivalent as
free.

## Authority map

| Mechanism | Authority |
| --- | --- |
| compiler + binder | lowering, value separation, missing/unused rejection |
| model-gen + `--check` | deterministic canonical-SQL / committed-binding freshness |
| native PostgreSQL + optional contract | SQL type and DB compatibility facts |
| application/live tests | behavior, mapping, policy, transaction semantics |
| review | whether the SQL expresses the intended business requirement |

## Scope and follow-up

Scope change required: **no**. Golden Path change required: **no**. Product
code/public API/current documentation changed: **no**.

No removal follow-up is recommended. Reconsider only on repeated evidence that
primitive-only applications provide equivalent fail-closed freshness without
recreating an equivalent lifecycle, or on a material selected-driver support
change. Evidence strength is **medium**: two arms and live oracles are strong,
but this is not a broad agent/application population study.
