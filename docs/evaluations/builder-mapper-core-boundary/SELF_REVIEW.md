# Self Review

## Source request

Builder Mapper Core Boundary Realignment Evaluation: decide dynamic-sort,
migration, applyPlan, and the core/optional/external boundary without changing
the product.

## Cycle 1: consistency review

- [x] Starting commit recorded and branch is evaluation-only.
- [x] Dynamic-sort runtime removal was separated from the CASE-shape decision.
- [x] Current CASE and finite-literal-composition consumers were inspected.
- [x] The finite-composition control rejects hostile and invalid input without
      representing user input as SQL syntax.
- [x] Migration SQL, summary, applyPlan, and risk output are described as
      separate representations; generated additive SQL is not called destructive.
- [x] DDL verification input is distinct from migration lifecycle ownership.
- [x] CORE / OPTIONAL PROOF / EXTERNAL classifications name current owners.

Finding: current historical safe-sort exercise material still describes the
removed adapter design. It is intentionally retained historical evidence and
is not current-product promotion. No stale current product claim was added.

## Cycle 2: human acceptance review

- [x] The report makes no product/code/API/package/current-doc change.
- [x] `REMOVE-FROM-ASHIBA` and `REMOVE` are future implementation decisions,
      not falsely claimed deletions.
- [x] SQL-resource is not promoted to core without an app/CI consumer.
- [x] The report preserves named parameters, PostgreSQL contract, query uses,
      narrow DDL lint, Scope, Golden Path, and DBMS positioning.
- [x] Limitations, evidence strength, and reconsideration triggers are present.
- [x] Reproduction and raw-result locations are included.

Finding: the primary reviewer decision is whether to accept migration and
applyPlan removal planning as the next breaking-change boundary. The report
makes the generated-SQL/applyPlan distinction visible so that decision is not
based on a false destructive-SQL claim.

## Triage

| Finding | Classification | Resolution |
| --- | --- | --- |
| Historical safe-sort exercise wording | follow-up | Keep as bounded historical evidence; do not rewrite past evaluation. |
| Migration/applyPlan removal needs implementation | follow-up | Bounded in `TARGET_BOUNDARY_AND_FOLLOW_UP.md`; no deletion is claimed here. |
| Product or evidence correctness blocker | blocker | None found. |

## Result

**Review readiness: ready after the final staged-file whitespace check and
orchestration-ledger finish.** Repository verification outcomes are recorded in
`raw-results.json`.
