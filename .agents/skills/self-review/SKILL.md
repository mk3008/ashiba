---
name: developer-self-review
description: Run two-cycle self-review and triage before presenting Ashiba developer work to a human reviewer or requester.
---

# Self Review

Use this skill when Ashiba developer work is about to be shown to a human. The goal is to run the repo-local two-cycle review, triage the findings, and decide whether the result is ready.

## Use It For
- Checking wording drift, mirror drift, and test drift before human review.
- Checking that final PR text and normal Codex work reports keep the required decision-oriented shape.
- Separating blockers from follow-up work and nits.
- Deciding whether the current result is ready for human review.

## Workflow
1. Run `consistency review`.
2. When a change migrates a representation, contract, or ownership boundary, trace every semantic consumer: production code, tests, fixtures, helpers, generated artifacts, examples, documentation, adapters, and verification scripts. Record any intentionally retained compatibility surface and its owner.
3. Search for superseded semantics beyond the old field name: old data shapes, duplicate representations, helper patterns, terminology, and ownership claims. Classify each remaining occurrence as intentional compatibility, a narrow historical fixture, or stale behavior/evidence.
4. Record findings about literal drift, mirror / test / policy mismatch, required fields, GitHub-safe references, per-item final form, and test wording.
5. Run `human acceptance review`.
6. Record findings about reviewer cognitive load, issue context, visible value, visible evidence, guarantee limits, gaps, and next human decision.
7. Triage each finding as `blocker`, `follow-up`, or `nit`.
8. Resolve blockers or mark the result not ready.

## Output Shape
- Source request or source issue
- Review cycle 1 findings
- Review cycle 2 findings
- Triage summary
- Review readiness
- What the human should decide next

## Constraints
- Run both review cycles before claiming readiness for human review.
- Do not call a semantic migration review-ready while consumer-facing ownership or vocabulary still describes the superseded model without an explicit, bounded compatibility reason.
- Do not treat wording-only issues as blockers by default.
- Do not bury blockers inside a summary paragraph.
- If a blocker remains, mark the result not ready.
