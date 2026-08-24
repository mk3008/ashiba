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

## Type mismatch escape analysis

### Observation

Before this correction, the live PostgreSQL container returned `typeof id`,
`customer_id`, and non-null `assignee_id` as `string` for the `bigint` DDL.
`pg` defaults to string representation for `int8`; `client.query<Ticket>()` is
a TypeScript-only generic annotation and performs no runtime decoding or OID
compatibility validation. The reference now uses PostgreSQL `integer`/`serial`,
whose default native `pg` result representation matches its `number` fields.
The reduced integer range is acceptable here because 64-bit identifiers are not
part of this fixed challenge's business behavior.

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

### Existing mechanism and prevention choice

Ashiba's optional `feature query postgres-contract` derives PostgreSQL and
default-driver representation evidence for generated feature-query contracts.
This direct native-pg/manual-row-type reference does not route through that
generated feature surface, so the applicable classification is **existing
detector partially covers it**. For this sample, one representative runtime
assertion is smaller and more direct than introducing generated metadata or a
new detector. The repository verification guidance now states the general rule;
the local AGENTS rule keeps it collocated with this repeatedly reviewed sample.
