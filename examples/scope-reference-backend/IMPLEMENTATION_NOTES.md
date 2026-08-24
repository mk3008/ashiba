# Implementation notes

## Observed fit

- **Clean fit:** visible SQL, named values, application-owned optional meaning,
  and an explicit native `pg` transaction are direct fits for Scope.
- **Sample-local workaround:** the list ordering helper combines a finite,
  reviewed application policy with the known `ORDER BY t.id asc` clause in
  `list.sql`. It is not a generic SQL builder and accepts only keys/directions.
  Its exact-text anchor is the highest-maintenance part of this sample, so its
  guardrails are behavior-tested rather than hidden.
- **Current API awkwardness:** `preparePostgresQuery` requires generated binding
  metadata tied to the exact SQL source hash. Applying application-owned
  ordering changes that source, so this reference uses a tiny local named-value
  preparer after placement instead of inventing a product artifact contract.
  That preparer is intentionally limited to this example's reviewed SQL and is
  not presented as a reusable SQL lexer.
- **Candidate simplification:** a future product surface could prepare named
  values after a caller-owned, finite ordering policy without taking ownership
  of business ordering or transactions.

## Reference status: reference-ready-with-friction

The standalone `postgres-contract` surface added in PR #71 and corrected for
RETURNING-column position in PR #72 now applies directly to this reference.
`pnpm verify` requires a development/test PostgreSQL URL, initializes the
reference schema through its native-pg integration test, then derives all four
contracts from PostgreSQL and default node-postgres representation. It checks
the application-owned flat TypeScript parameter and `Ticket` result types, and
rejects bigint-as-number result/parameter and stale-SQL controls.

The checked-in artifacts are not source-hash-only evidence: verification
rewrites them from the live database and fails if that evidence differs from
the committed artifacts. This preserves the direct canonical SQL → PostgreSQL
→ node-postgres → manual TypeScript → native runtime path.

The remaining friction is intentionally unchanged: application-owned ordering
is placed before the sample-local named preparation, which cannot use the
source-hash-bound product preparation artifact. That is a local integration
friction, not a type-contract gap, and no mapper/repository/UoW/runtime adapter
was introduced to conceal it.

## Historical blocker: not-yet-a-credible-reference

### Observation

The first version declared `Ticket.id` as `number` against PostgreSQL `bigint`.
Live PostgreSQL showed that default `pg` represents this `int8` value as a
`string`; `client.query<Ticket>()` is a TypeScript-only generic and does no
runtime decoding or OID compatibility validation. The reference has restored
natural 64-bit identifiers and now declares their result fields as `string`.
The native-driver assertions remain useful supplementary integration evidence.
They are not PostgreSQL-derived deterministic contract coverage.

### Why it escaped

- **Primary cause:** the integration test normalized values with `Number(...)`
  before asserting business results, so it proved values but hid runtime shape.
- **Contributing cause:** the original acceptance plan did not include runtime
  PostgreSQL/TypeScript row-type fidelity; verification therefore had no
  explicit reason to inspect decoder output.
- **Contributing cause:** `query<Ticket>` was treated as if it were runtime
  proof, although it is only a compile-time declaration.
- **Non-cause:** `$ashiba-scope-review` is an ownership/boundary review and is
  not responsible for PostgreSQL decoder or every row-type audit.
- **Non-cause:** the earlier fresh review packet asked architecture/scope
  questions, not a native driver type-fidelity audit.

### Existing mechanism and blocker classification

Ashiba's optional `feature query postgres-contract` derives PostgreSQL and
default-driver representation evidence, source staleness, and false mapper type
claims for a VSA-local `src/features/<feature>/queries/<query>/query.ts` path.
The direct canonical-SQL/native-`pg` reference has no supported connection from
the derived contract to its manual `Ticket` type. Its classification is **D**:
the current product cannot make a false `bigint`-to-`number` application claim
fail without reintroducing the old generated feature/query architecture.

This is a product blocker, not permission for a sample-local comparator or for
using runtime assertions as the type proof. PR #70 must remain unmerged until a
separate, narrow standalone canonical-SQL contract surface provides parameter,
result, driver-representation, and source-staleness evidence and connects it
deterministically to the application-declared types. It must not take ownership
of application ordering, transaction handling, a mapper framework, or SQL
ownership.

The ordering/preparation mismatch is independent: application-owned ordering
changes SQL text after the source-hash-bound `preparePostgresQuery` input, so
this sample uses a deliberately local named-value preparer. Solving the
development-time type-contract blocker must not conceal or merge that runtime
preparation problem.

### PR #45 durable placement audit

| Area | Status | Current durable location |
| --- | --- | --- |
| A. Product implementation | present | `feature query postgres-contract`, `postgres.contract.json` parsing/staleness checks, driver-profile checks, and live CLI tests under `packages/cli` and `packages/driver-adapter-pg` |
| B. Docs/evaluation | present | `docs/guide/postgres-contract.md`, runtime-boundary/README guidance, and verification-value/responsibility-placement evaluations |
| C. Developer guidance / Scope routing | partial | `docs/design/ashiba-scope.md` and `$ashiba-scope-review` still define ownership rather than lane selection. `.codex/agents/verification.md` now routes generated feature-query work to the existing live PostgreSQL-derived contract and requires direct native-driver work to record a product gap when no supported surface applies. |

This is not a Scope-review failure: that skill answers responsibility ownership,
not which correctness lane to select. It was a developer-workflow routing gap;
the routing rule does not remove the standalone-product blocker.
