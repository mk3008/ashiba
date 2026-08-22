# Follow-up Workload Specification

## T1 — Atomic account transfer

Business situation: move a requested amount between two ordinary customer accounts. The supplied schema has `accounts(account_id, balance_cents)` and a transfer audit row. The agent implements `transfer(from, to, amount)`.

The supplied table is exactly `accounts(account_id BIGINT PRIMARY KEY,
balance_cents BIGINT NOT NULL CHECK (balance_cents >= 0))`; amounts and
balances are integer cents, not decimal currency fields. The runner owns
`transfer_audit(from_account_id BIGINT, to_account_id BIGINT, amount_cents
BIGINT, note TEXT)`. Candidate code must use the supplied names and must not
create, migrate, or substitute another schema.

At invocation the runner supplies `DATABASE_URL` and a safe nonce
`BENCHMARK_SCHEMA`. Candidate code must either set `search_path` to that schema
for its connection or schema-qualify with that value after safe identifier
validation. It must not hard-code `public`.

Required behavior: debit and credit occur in one database transaction; insufficient balance leaves balances and audit rows unchanged; a runner-injected failure after debit leaves no partial state; a successful transfer has expected final balances and one audit row; runtime inputs are bound values; and the application boundary makes its transaction operation callable by the runner. The adapter may invoke it but must not add transaction logic.

Out of scope: distributed transactions, SAGA, retries, and cross-service work.

## T2 — Concurrent work-item claim

Business situation: two workers claim independent queued work items. The supplied schema has `work_items(id, state, claimed_by)`.

The supplied table is exactly `work_items(id BIGINT PRIMARY KEY, state TEXT
NOT NULL CHECK (state IN ('queued', 'claimed')), claimed_by TEXT NULL)`. At
invocation the runner supplies `DATABASE_URL` and a safe nonce
`BENCHMARK_SCHEMA`; candidates must use that namespace rather than `public`.
They must not create migrations or replace the supplied schema.

Required behavior: two simultaneous worker calls must not claim the same item; with two queued items, worker A and B claim different items; a runner-injected rollback leaves the item unclaimed; and the final committed database state is correct.

The implementation is free to choose its PostgreSQL mechanism; `FOR UPDATE SKIP LOCKED` is a common solution, not a prompt requirement. The runner uses two independent PostgreSQL connections.

## W5 — Brownfield investigation and tuning

Business situation: an existing endpoint returns a correct page but is slow at production-like row counts. Each arm receives an equivalent starter using its normal query style and the same data distribution. The starter intentionally uses a correct but slow deep-offset pagination path.

Agent task: investigate the executed PostgreSQL query, obtain EXPLAIN evidence, identify the cause, improve performance while preserving endpoint behavior, and verify the final application. The prompt does not prescribe a SQL rewrite or a tool-specific protocol.

Runner checks: before behavior and EXPLAIN; final behavior and EXPLAIN; result equivalence; regression cases; and candidate source diff. It independently measures improvement. Worker evidence records whether the agent actually used EXPLAIN. The runner-owned fixed entrypoint is part of every starter, so agents do not need to create a special JSON protocol.

## Human review observations

For every final artifact record: canonical SQL visible; generated SQL only; ORM/DSL source; transaction boundary visibility; steps required to reach the EXPLAIN target SQL; and tool-specific escape/fallback. These are descriptive, not LOC scores or a ranking.
