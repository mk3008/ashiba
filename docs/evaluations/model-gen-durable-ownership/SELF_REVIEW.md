# Self review

## Source request

Re-evaluate durable ownership of `model-gen`, generated binding metadata, and
freshness without changing product behavior, Scope, Golden Path, public API, or
current product documentation. The review specifically required a no-committed-
artifact alternative rather than inferring retention from artifact drift alone.

## Cycle 1 — consistency review

| Check | Result |
| --- | --- |
| Named compiler/binder and model-gen workflow decisions are separated | pass |
| Arm C excludes CLI, static binding module, source hash, and freshness lifecycle | pass |
| Arm C retains strict TS, direct compiler cache, binder, native pg, and shared behavioral acceptance | pass |
| Semantic drift preserves parameter set and distinguishes runtime behavior from source identity | pass |
| Parameter-shape drift distinguishes stale artifact from fresh binder behavior | pass |
| Arm B semantic control is accurately labelled as reconstruction, not a rerun Fresh Agent | pass |
| Comment-only drift is no longer strongest runtime evidence | pass |
| Compile measurement is bounded startup feasibility, not a throughput claim | pass |
| Existing optional-helper exports are excluded from a model-gen removal claim | pass |
| Product, public API, Scope, Golden Path, and current documentation are unchanged | pass |

## Cycle 2 — human acceptance review

| Review concern | Result |
| --- | --- |
| Can a reviewer find the revised decision quickly? | yes: `DECISION.md` and `REPORT.md` begin with REDUCE. |
| Is conditional model-gen value still visible? | yes: static artifacts receive fail-closed freshness proof. |
| Is the no-artifact alternative concrete rather than aspirational? | yes: one isolated Fresh Agent application and PostgreSQL oracle passed. |
| Is the scaffold analogy answered rather than assumed? | yes: generated state was directly eliminated in Arm C. |
| Are live SQL limitations clear? | yes: all arms needed typed nullable guards verified by PostgreSQL. |
| Is the future boundary explicit? | yes: follow-up Scope/Golden Path migration is separated from this evaluation. |

## Triage

- Blockers: none after final repository verification and remote CI confirmation.
- Follow-up: a separate model-gen reduction/migration design must handle current
  references, selected-driver evidence, distribution paths, Scope/Golden Path,
  and independent helper exports.
- Nits: Arm C candidate source is temporary. The committed harness/input,
  oracle, drift harness, measurement, raw results, and reproduction guidance
  make the experiment auditable without adopting it as product source.

## Retro gate

`tmp/RETRO.md` must be checked again at final handoff. Any open item is a PR
readiness blocker; accepted defers must be surfaced in the final report.

## Review readiness

Pending final repository verification, cleanup, metrics-ledger finish, and
remote CI for the new commit. No product change is claimed by this evaluation.
