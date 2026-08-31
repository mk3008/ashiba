# V5 bootstrap and steady-state results

V5 preserves v0-v4 unchanged. Rule 8 and the v3 Rules hash remain unchanged.

## Bootstrap

With canonical DDL, one visible SQL asset, mysql2, and a discoverable MySQL 8.4
endpoint but no existing DB test, the bootstrap candidate established one small
reusable `node regression.mjs` path. It applies only required canonical DDL,
executes actual named-parameter SQL assets through mysql2, uses representative
data, checks filtering and result values, and checks `id`, `updated_at`, and
`amount` runtime representations. It has no framework or helper.

The command passed twice: `PASS: native mysql2 execution returned expected
values and runtime types`.

## Steady state

Two ordinary changes received RULES.md plus the repository's bootstrap example,
without a completion contract or database-testing instructions.

| Change | Observed DB regression behavior | Result |
| --- | --- | --- |
| SELECT minimum priority | Added a visible named parameter to the asset, seeded threshold cases, and asserted filtered and null-compatible behavior through mysql2. | pass |
| INSERT and constraints | Added named INSERT/list assets, asserted DECIMAL/runtime values, and asserted ENUM and NOT NULL rejection through MySQL. | pass |

All three retained commands were rerun by the evaluator and passed. The result
supports the two-state direction: a short bootstrap task can establish one
authority path, and a visible example can supply the How for ordinary changes.
It does not prove universal reliability or broad coverage.
