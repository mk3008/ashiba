# SQL Resource Durable Ownership Final Ablation

## Decision

`sql-resource snapshot`: **REMOVE**.

`sql-resource compare`: **REHOME-AS-GENERIC-TOOL**, conditional on a later
derive-now implementation proving real PostgreSQL fleet value without committed
snapshot state. Neither capability belongs to Builder Mapper core.

## Arms and result

| Arm | Workflow | Result |
| --- | --- | --- |
| A | Persisted snapshot JSON then current compare | The existing comparison selected two changed queries at 20/300/3000 scale; it also carries 2N + 1 generated files in normal use. |
| B | Git/hash/rg candidate reduction, no artifact | Selected the same two source files at all scales. Git fully covers identity, membership, and text review. |
| C | In-memory direct compiler facts, no artifact | Selected the same two source/parameter changes at all scales. PostgreSQL contract facts need a future temporary DB derivation. |

The scale fixture has realistic SQL structure and ten change controls. It is
not a claim of 3000-query PostgreSQL live throughput. Existing focused and live
tests provide the separate current comparator evidence.

## Independent value versus generated lifecycle

Snapshot's source hash reports comment-only change as `needs-review`; it does
not semantically interpret a changed SQL source. File membership and source
identity are ordinary Git concerns. Parameter facts can be directly compiled
and missing/unused binding is independently owned by the named primitive.
Therefore the generated state itself is not justified by the checker it makes
necessary.

There is a residual semantic value: when SQL does not change but a PostgreSQL
schema does, current live tests classify prepare errors, result/parameter/
driver/dependency changes, enum and integer-widening cases, and uncertain
domain/view cases. Git cannot mechanically supply that classification. This is
an optional PostgreSQL repository-analysis capability, however, not required
for visible SQL -> named binding -> native driver and not specific to Ashiba.

## Replacement operating model

For ordinary SQL changes: Git diff plus targeted compile/binder and
application/live tests. For a proven fleet schema-review need: derive before
and after PostgreSQL facts transiently from revisions and reproducible
databases, fail closed on preparation error, publish a compact report, then
delete all temporary evidence. A generic tool may own that optional workflow;
it must demonstrate a real consumer and the live mutation matrix first.

## Scope and evidence

This PR changes no product code, public API, Scope, Golden Path, current user
documentation, or Skill. Evidence strength is **medium**: current unit/live
tests and new three-arm 20/300/3000 ablation are strong for the artifact
question; the database URL was unavailable, so no fresh live matrix or
end-to-end real-fleet benchmark was run.

Reconsider only for a real user that needs irrecoverable time-shifted catalog
evidence, or if a derive-now generic comparator fails at realistic database
scale.
