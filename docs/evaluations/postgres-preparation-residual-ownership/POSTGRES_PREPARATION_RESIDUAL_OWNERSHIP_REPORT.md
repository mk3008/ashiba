# PostgreSQL Preparation Residual Ownership Report

## Decision question

After Driver Adapter Reduction Phase 2 removed ordinary PostgreSQL execution,
should Ashiba retain the remaining PostgreSQL preparation packages as durable
product packages, and which narrow capabilities still have a justified owner?

This is an evaluation-only record. It starts from main at
`9544f7490d65acd492b61974eb1f2f9ced844924` and changes no product behavior.

## Outcome

**Overall decision: `REDUCE`.**

`@ashiba-ts/driver-adapter-pg` is not justified as a general PostgreSQL
preparation package. Its ordinary binding path, runtime source-hash gate,
safe-sort integration, and driver-profile assertion have narrower owners or
already have an adapter-external owner. The only residual with a demonstrated
unique early proof is optional-condition compression. It remains **KEEP
OPTIONAL / productization pending**, not a reason to retain the whole adapter
surface.

`@ashiba-ts/driver-adapter-core` has no independently demonstrated shared
runtime package responsibility after Phase 2. Its remaining contracts must be
split by the producer or the still-retained optional capability before the
package can be removed; the package itself is a **REMOVE candidate**.

## What Phase 2 already established

Phase 2 moved the final call to application-owned `pg.query(sql, values)` and
removed connection, transaction, retry, execution-observer, masking, and
feature-executor ownership. See
[`../driver-adapter-reduction-phase-2/IMPLEMENTATION_REPORT.md`](../driver-adapter-reduction-phase-2/IMPLEMENTATION_REPORT.md).

The remaining code prepares data only. It neither imports `pg` nor calls a
client. That is a materially smaller question than the earlier adapter family
decision; it must not silently reintroduce ordinary execution ownership.

## Capability conclusion

| Capability | Recommendation | Narrow owner / reason |
| --- | --- | --- |
| ordinary named binding to indexed PostgreSQL SQL | REMOVE from pg package | `@ashiba-ts/named-parameters` and generated binding metadata already own deterministic lowering and set validation. |
| runtime source-hash comparison | REDUCE | Build-time `model-gen --check` is the normal freshness boundary; retain an in-transform fail-closed check only if a retained optional transform needs its coordinate proof. |
| safe-sort rendering and splice | REMOVE from runtime package | A reviewed application finite map rejects hostile input; prior ablation classifies the packaged mechanism as Rule Only. |
| optional-condition compression | KEEP OPTIONAL / productization pending | It uniquely rejects stale generated coordinate metadata before native execution, but is not core and must not keep a broad adapter by implication. |
| PostgreSQL contract profile assertion | REMOVE from preparation package | Standalone PostgreSQL contract is already optional and adapter-external; profile compatibility belongs with that contract boundary, if retained. |
| query/contract metadata types | REDUCE and colocate | Types are producer/consumer contracts, not evidence for a shared adapter package. |

## Scope verdict

```
Scope verdict: unclear / evidence-needed
Affected boundary: optional PostgreSQL preparation transformations
Current scope: optional-condition coordinates are experimental / productization pending;
native drivers own execution; binding and mechanical verification are retained.
Observed proposal: reduce broad pg/core package ownership without changing any capability now.
Why this matters: retaining an optional proof must not recreate a generic execution or application architecture package.
Recommended next action: decide optional-condition productization separately, then remove or extract only its proven verifier.
```

No Scope or Golden Path change is required by this evaluation.

## Evidence and limits

Repository evidence includes the current focused package tests, Phase 2 live
verification, generated metadata consumers, and the prior dynamic-mechanism
ablation. The latter shows that safe sort adds no observed repair or hostile
input advantage over a finite application rule, while optional compression
does reject stale coordinate metadata before a database call.

The evidence is **medium**: it includes current source and focused tests plus
prior controlled evaluation, but it does not run a new multi-application
optional-compression adoption study. That absence prevents productization of
the optional transform and prevents a claim that all residual metadata can be
deleted immediately.

See the decision, matrices, dependency graph, and raw result index in this
directory for the complete reviewer path.
