---
name: ashiba-scope-review
description: Classify an Ashiba boundary-affecting proposal against the canonical product scope.
---

# Ashiba Scope Review

Before reviewing a boundary-affecting proposal, plan, or diff, read
`docs/design/ashiba-scope.md`, then read the proposal and affected files.
Do not copy or restate the Scope document here.

Identify the responsibility that changes, who owns it today, and whether the
proposal changes that ownership. Return one concise verdict:

- `in-scope`: an existing Ashiba responsibility is being implemented.
- `implementation-choice`: the scope is satisfied; the remaining choice belongs
  to the product or application implementation.
- `scope-extension`: a new responsibility is proposed for Ashiba core; explain
  the value, evidence required, and application-owned alternative.
- `out-of-scope`: a defined application responsibility is being absorbed into
  core without a scope-change case.
- `unclear / evidence-needed`: Scope marks the area provisional, experimental,
  or productization-pending.

Use this shape:

```
Scope verdict: <verdict>
Affected boundary: <responsibility>
Current scope: <owner/maturity>
Observed proposal: <proposal>
Why this matters: <one sentence>
Recommended next action: <one sentence>
```

Do not treat a research result or productization-pending evaluation as an
automatic rejection. Do not apply this skill recursively to the Scope document.
