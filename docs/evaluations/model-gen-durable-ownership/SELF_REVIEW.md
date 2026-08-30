# Self review

## Source request

Evaluate durable ownership of `model-gen`, generated binding metadata, and
freshness without changing product behavior, Scope, Golden Path, public API, or
current product documentation.

## Cycle 1 — consistency review

| Check | Result |
| --- | --- |
| Decision question and named primitive are separated | pass |
| Current versus detached/test-only consumers are classified | pass |
| Generated fields are classified by owner/use | pass |
| Arm A and Arm B use equal behavioral requirements and independent PostgreSQL oracles | pass |
| Fresh-agent input excludes CLI/workflow instruction | pass |
| Change exercise records stale behavior, commands, repairs, and live result | pass |
| `model-gen` is not credited with PostgreSQL type/semantic safety | pass |
| Shared optional-capability helpers in `model-gen.ts` are not included in a removal claim | pass |
| Scope / Golden Path / product-code invariants are recorded | pass |
| Repository docs, packages, public commands, and examples are unchanged | pass |

One intentionally negative control passed an Arm B build with stale binding
content. It is described as a limitation of that candidate's local mechanism,
not generalized to every possible primitive-only implementation.

## Cycle 2 — human acceptance review

| Review concern | Result |
| --- | --- |
| Can a reviewer find the single decision quickly? | yes: `DECISION.md` and `REPORT.md` begin with it. |
| Is the strongest KEEP evidence concrete? | yes: Arm A stale rejection versus Arm B drift-control pass. |
| Is the strongest REMOVE evidence visible? | yes: Arm B reached identical final behavior without the CLI. |
| Are safety limits clear? | yes: typed nullable SQL required live proof in both arms. |
| Are AI claims bounded? | yes: one fresh agent, no telemetry, no population claim. |
| Are next actions clear? | yes: retain; only reconsider under stated evidence triggers. |

## Triage

- Blockers: none.
- Follow-ups: none recommended by this decision. A future reevaluation needs
  repeated comparable primitive-only freshness evidence, not a cosmetic API
  simplification.
- Nits: temporary candidate source is not committed; committed prompt/harness,
  oracle, raw results, and reproduction paths describe the evidence instead.

## Retro gate

`tmp/RETRO.md` was absent at review time, so there were no open or accepted
defer items to gate this evaluation.

## Review readiness

Ready for human review after final repository verification, temporary-resource
cleanup, and remote CI confirmation.
