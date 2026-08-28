# Named Parameter Decision

## Decision

**`KEEP-NAMED-AS-CORE`**

Driver decisions:

| Driver | Decision | Exact reason |
| --- | --- | --- |
| PostgreSQL / pg | retain Ashiba named path | pg exposes indexed `$n` and ordered values, not meaningful names; direct path makes predicate insertion/reorder an order-coupling task |
| MySQL / mysql2 | retain Ashiba named path; recognize driver named capability | `namedPlaceholders: true` works and owns `:name → ?`, but silently accepts unused object properties; it is an implementation-delegation input, not an immediate canonical-policy replacement |
| SQL Server / mssql | retain Ashiba named path; recognize driver named capability | direct `@name` + input works, but extra inputs are accepted; current Ashiba adds common unused rejection |

## Exact reason

In the AI-maintained, human-reviewed setting, the human effort of manually renumbering `$n` is not a sufficient retention reason. The live evidence nevertheless shows a durable deterministic boundary: Ashiba validates the *set* of application-supplied names before execution and carries semantic identity from canonical SQL into selected-driver bindings. The selected direct routes reject absent values but do not provide a common unused-value guard. The primary pg path has no driver-facing named alternative at all.

This does not overclaim. Named parameters do not prevent a semantic cross-wire or a same-type wrong value, and those require application/live tests. The durable value is order/callsite identity and deterministic set validation, not semantic correctness.

## Surface and Golden Path

The current Golden Path remains:

```text
canonical SQL
→ deterministic binding metadata
→ bindNamedParameters
→ native driver
→ optional PostgreSQL contract
→ application/live tests
```

`model-gen` has independent result-contract and optional metadata duties. Safe-sort/optional-condition PostgreSQL coordinate conversion currently depends on named compilation. A direct-driver proposal therefore does not yet demonstrate a large clean removal; it risks replacing the same boundary with positional metadata or comment conventions, which this evaluation forbids.

## Compatibility and Scope

Scope change required: **no**. The settled canonical named requirement remains justified by the new evidence. The public package, CLI behavior, generated bindings, and examples would be breaking migration surfaces if reconsidered; compatibility is not the reason for the decision.

## Evidence strength and uncertainty

Evidence strength: **medium**. Three selected drivers and live engines were exercised; source-level capability evidence and negative controls are reproducible. Limitations: one logical fixture/task, no independent fresh-agent arm, no token telemetry, and no mutation-specific live control. The conclusion is not based on an AI-speed claim.

## Reconsideration trigger

Reopen only if all of the following become true: (1) pg gains a selected application-facing meaningful named API or direct positional edits show no material review/repair failures in repeated independent AI maintenance; (2) an alternative supplies missing/unused set validation without creating an equivalent Ashiba metadata framework; and (3) source-level analysis demonstrates that coordinate/contract responsibilities can be removed rather than reimplemented. Convenience, a new driver elsewhere, or a hypothetical framework is not a trigger.

## Follow-up

No implementation task is recommended now. Preserve a focused selected-driver regression probe if driver versions materially change; otherwise revisit only on the stated trigger.
