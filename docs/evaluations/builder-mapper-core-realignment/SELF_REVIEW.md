# Self Review

Source request: Builder Mapper Core Realignment Implementation.

## Cycle 1: consistency review

| Check | Result |
| --- | --- |
| Migration command, catalog, implementation, contracts, risk model, tests, exercise, promo asset, and current docs | Removed; no retained compatibility surface. |
| DDL-backed lint, query uses, SQL-resource, PostgreSQL contract, named binding, and model generation | Still present and covered by the standard verification path. |
| Support Inbox canonical SQL, generated source mirror, generated binding metadata, request params, execution call, inspection output, route assertions, and focused safety test | Aligned to the finite reviewed composition boundary. |
| Raw request to SQL-syntax path | None found: parsing normalizes or drops public inputs; composition accepts only closed-map literals and rejects invalid direct calls. |
| Current product docs | Migration lifecycle is external/application-owned; dynamic SQL guidance distinguishes finite reviewed literals from raw interpolation. |
| Historical evidence | Not rewritten. |

## Cycle 2: human acceptance review

The visible value is a smaller Builder Mapper core: no Ashiba migration
product, and no 120-branch SQL sort matrix. The reviewable evidence is the
removed CLI surface, a direct finite-map test, the live Support Inbox route
suite, and the before/after counts in `IMPLEMENTATION_REPORT.md`.

The guarantee limit is explicit: the finite mapping proves closed selection,
not business ordering correctness. Applications continue to review policy and
test query semantics. Migration lifecycle moves to dedicated/native/project
tooling rather than to a replacement Ashiba abstraction.

## Triage

| Finding | Triage | Resolution |
| --- | --- | --- |
| Empty sort initially rendered a leading comma in the composed `ORDER BY` | blocker | Fixed and covered by the no-optional-sort focused test plus the live route suite. |
| Route inspection placeholder assertions still used pre-removal parameter positions | blocker | Updated to `$8`/`$9` and verified live. |
| Historical dogfooding records mention former migration/safe-sort behavior | intentional historical evidence | Retained; current docs and current CLI surface no longer promote them. |

## Review readiness

No blockers remain. Human review should decide whether the breaking CLI and
documentation migration boundary are acceptable; no Scope, Golden Path, or
DBMS-positioning decision is requested.
