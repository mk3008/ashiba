---
name: durable-ownership-evaluation
description: Evaluate whether a bounded product surface has durable ownership value without changing product behavior.
---

# Durable Ownership Evaluation

Use this skill for a bounded product-surface ownership or reduction evaluation.

1. State the decision question, current product boundary, non-goals, and completion criteria before investigation.
2. Inventory implementation, public/package surface, consumers, dependencies, generated artifacts, documentation, tests, and compatibility obligations. Separate current consumers from historical or detached consumers.
3. Compare the current surface with the smallest plausible alternative. Do not assume an alternative is better because it is native, smaller, or already implemented.
4. When claiming deterministic failure prevention, run or cite a negative control that demonstrates both the claimed protection and the alternative's behavior. Record what remains application/test responsibility.
5. Evaluate capability-level ownership separately from package/location ownership; avoid removing a bounded independent guard merely because a package is reducible.
6. Record reproducible evidence, maintenance surface, unresolved items, a single decision, and a concrete reconsideration trigger.
7. Do not change product behavior, Scope, or public compatibility during the evaluation. If a rational conclusion requires such a change, stop and report a human blocker.
8. Clean up temporary resources. Before human review or a blocker handoff, commit and push the evaluation artifacts, state verification status, and distinguish repository evidence from supplementary evidence.
