# Named Parameter Durable Ownership Evaluation

## Outcome

**Decision: `KEEP-NAMED-AS-CORE`.**

This re-evaluation was required because the operating assumption changed: AI now performs most edits and a human primarily reviews. Human convenience in renumbering placeholders is therefore not enough to retain an abstraction. The question was whether named parameters still provide unique deterministic safety that justifies Ashiba's compiler, binding metadata, freshness, binder, model generation, and driver integration surface.

The answer is yes for the current selected drivers. `pg` exposes positional `$n` and ordered values, not meaningful application-facing names. `mysql2` can accept `:name` with `namedPlaceholders: true`, and `mssql` accepts `@name` plus `request.input`; neither driver rejects unused registered/object values. Ashiba remains the only evaluated common pre-execution guard for both missing and unused application values, while retaining one canonical parameter identity across all three selected drivers. The primary `pg` path otherwise turns an SQL/callsite change into an ordered-value maintenance task.

Named parameters do **not** prevent semantic cross-wiring such as `shop_id = :status`; application and live tests remain authoritative for semantics.

## Boundaries

The `.sql` asset boundary was fixed for this evaluation. No TypeScript-template alternative was evaluated. This branch changes no product code, Scope, canonical SQL, generated format, or public documentation policy.

Driver-facing capability—not DBMS protocol syntax—was evaluated:

| Driver | Application syntax | Driver/internal lowering | Protocol-facing form | Driver decision |
| --- | --- | --- | --- | --- |
| `pg` 8.21.0 | `$n` + ordered array | none observed | indexed | direct positional is viable but not selected as the canonical Ashiba path |
| `mysql2` 3.22.3 | `:name` + object with `namedPlaceholders: true` | driver lowers to `?` | anonymous | useful driver capability, but does not replace unused-value rejection |
| `mssql` 11.0.1 | `@name` SQL + `request.input(name, value)` | driver/request binding | named | useful driver capability, but does not replace unused-value rejection |

## Evidence at a glance

- Live PostgreSQL 18, MySQL 8.4, and SQL Server 2022 runs completed with selected installed drivers.
- All normal arms returned the same expected row.
- Direct/driver routes reject missing required values, but mysql2 and mssql accept an unused supplied value.
- The current binder rejects missing and unused values before execution for all renderings.
- Direct positional and named routes all left the deliberately semantic cross-wire and a same-type swap as query-shaped but wrong-result cases; named identity is not semantic proof.
- No fresh independent agent arm was available. The editing matrix therefore records deterministic edit requirements and review diffs, not invented AI success/token telemetry.

See [decision](NAMED_PARAMETER_DECISION.md), [live raw results](raw-results.json), [negative controls](NEGATIVE_CONTROLS.md), and the [surface reduction map](SURFACE_REDUCTION_MAP.md).
