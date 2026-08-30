# Decision

## Model-generation workflow: KEEP

Ashiba should retain the current narrow `model-gen` workflow as a durable
product surface. The decision is not based on human typing convenience, the
mere presence of current documentation, or the fact that the Arm A reference
already used it.

The decisive observed value is deterministic, fail-closed source/artifact
freshness. Arm A's `--check` rejected an intentionally stale generated binding
before build, test, or database execution. Arm B passed the same application
acceptance using only the named primitives, but its fresh agent independently
created a static binding artifact and did not create equivalent freshness
proof: a source-only drift control passed its build with stale binding retained.
Recreating a sound local comparison would move rather than remove this
maintenance responsibility.

## Sub-surface decisions

| Surface | Decision | Reason |
| --- | --- | --- |
| Named compiler and binder | KEEP (independent core) | Both arms require deterministic lowering and missing/unused rejection. |
| `model-gen` CLI / deterministic lowering artifact | KEEP | Standardizes a build-time import boundary rather than application-local parser/lowering code. |
| Generated binding module | KEEP | Enables a stable, precompiled binding boundary used by current references. |
| `sourceHash` and exact freshness check | KEEP | Unique observed source/artifact drift proof; binder does not provide it. |
| All-driver artifact contents | no separate reduction decision | This evaluation live-tested pg only. Current selected-driver renderings remain within the retained workflow, but MySQL/MSSQL artifact granularity needs separate evidence before change. |
| Shared SQL-resource / PostgreSQL-contract helpers located in `model-gen.ts` | no decision here | They are separate optional-capability consumers and must not be removed by a workflow decision. |

## Limits

`model-gen` does not validate nullable PostgreSQL type resolution, business
semantics, result mapping, transaction behavior, or application tests. Arm A
and Arm B both needed an explicit SQL cast repair detected only by live
PostgreSQL proof. The workflow adds synchronization proof, not semantic SQL
correctness.

## Maintenance verdict

The maintained surface is real—CLI/API, artifact format, hash/check semantics,
driver renderings, docs, prompts, reference scripts, tests, and compatibility.
The primitive-only arm shows that simple applications can operate without it,
so the benefit is not required for execution. But it does not demonstrate a
comparable safety/maintenance alternative. Its naturally reconstructed static
artifact reintroduced the coupling without the proof. On current evidence,
centralized ownership costs less than repeatedly teaching or rebuilding an
equivalent lifecycle.

## Scope verdict

Scope verdict: in-scope
Affected boundary: deterministic binding metadata and source freshness
Current scope: Ashiba core/current decision
Observed proposal: evidence-based evaluation without product change
Why this matters: the workflow is retained only if its proof exceeds its durable
maintenance cost.
Recommended next action: retain the current workflow; do not create a removal
implementation task.

Scope change required: no. Golden Path change required: no. Product code
changed: no.

## Evidence strength and reconsideration

Evidence strength: **medium**. It includes current consumer/history census,
one strict fresh primitive-only agent, a matched change exercise, a deliberate
drift control, and independent PostgreSQL oracles. It is not a broad population
study of applications or agents.

Reconsider only if repeated primitive-only applications demonstrate equivalent
fail-closed source/artifact proof without reintroducing an Ashiba-equivalent
generator/check convention, or if current selected-driver support materially
changes. AI capability alone, a one-off direct compiler script, or a preference
for fewer commands is not enough.
