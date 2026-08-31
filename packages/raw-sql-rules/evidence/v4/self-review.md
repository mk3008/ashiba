# V4 self-review

## Source request

PR #114 requested a small A/B experiment separating implementation constraints
from an explicit database-work completion contract, without strengthening Rule
8 or rewriting V3 evidence.

## Cycle 1: consistency review

- `RULES.md` remains v3; V4 records no Rules amendment or hash change.
- README, evaluation report, plan, candidate paths, and verification record all
  distinguish retained invalid preflight candidates from corrected treatment
  candidates.
- The report calls the corrected three-probe A/B comparison `partial`, not a
  reliable effect; its outcome remains `NOT-YET`.
- Package check requires the V4 plan, evidence, and representative actual
  candidate/test files.

Finding: no blocker. The corrected protocol has three rather than four probes;
the report exposes that deviation and does not claim consistency.

## Cycle 2: human acceptance review

- Reviewer-visible value: it preserves V3's failure and establishes that a
  concrete MySQL fixture changed observed behavior in both arms.
- Evidence limit: Rules-only success and completion-contract success are not a
  causal comparison because Arm B has one corrected probe and V3 conflicts.
- No framework, testkit, helper, or mechanical enforcement was added.

Triage: blocker none; follow-up is a future, separately preregistered task only
if a human wants to isolate fixture availability from the completion-contract
treatment. Nit none.

## Review readiness

Ready for human review. The human decision is whether to accept the evidence as
an inconclusive `NOT-YET` research result or request a new controlled study;
merging must not be read as a claim that the completion contract is proven.
