# Native Driver Contrast and Failure Evidence

## Ordinary execution

The Ticket Queue reference is the current native PG control: canonical SQL is compiled at build time, `bindNamedParameters` prepares values, and native `pg` executes. It has no adapter dependency. This proves that the Golden Path execution path does not require `driver-adapter-pg`.

MySQL and SQL Server adapters each reduce to the same sequence:

```text
check source hash -> bindNamedParameters -> client.execute/request.input+query
```

Their unit tests prove the adapters reject missing/unused values and stale binding metadata. Named Parameter Durable Ownership Evaluation independently proved that missing/unused binding belongs to named core, while selected native drivers own their own application-facing calls.

## Negative controls

| Control | Adapter behavior | Native/core behavior | Interpretation |
| --- | --- | --- | --- |
| missing named value | adapter wraps named-core error | named core rejects before driver | not adapter-unique |
| unused named value | adapter wraps named-core error | named core rejects before driver | not adapter-unique |
| stale metadata source hash | adapter rejects before driver | `model-gen --check` detects artifact staleness at build; an app can compare the same hash if it supplies mutable runtime SQL | real guard, package ownership not established |
| unknown safe-sort key | PG adapter rejects | application finite map can reject; prior ablation measured equivalent hostile-input rejection | not package-unique |
| stale optional coordinate text | PG adapter rejects before pg | no equivalent claimed for ordinary nullable guards | bounded optional early proof |
| retryable PG error | classifier labels candidate | application still decides idempotency/retry | Scope-owned application policy |

The adapter does not observe direct native calls. Thus it cannot be a general safety claim for an application; its deterministic checks apply only to adapter-bound execution.

## Reproduction

```sh
pnpm --filter @ashiba-ts/driver-adapter-core test
pnpm --filter @ashiba-ts/driver-adapter-pg test
pnpm --filter @ashiba-ts/driver-adapter-mysql2 test
pnpm --filter @ashiba-ts/driver-adapter-mssql test
pnpm --filter postgres-ticket-queue-reference test
```

For live PG evidence, use `pnpm verify:postgres-live`. No new live DB claim is needed for MySQL/MSSQL adapter wrapping because the relevant selected-driver behavior was live-tested by the named-parameter evaluation and these adapters add no database semantics.
