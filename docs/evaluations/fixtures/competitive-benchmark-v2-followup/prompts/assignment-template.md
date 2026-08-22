# Fresh-agent assignment template

This template is the durable copy of the common instructions used for the scored
cells. It preserves the shared task constraints; workload-specific requirements
were supplied from the frozen workload specification.

> Use the installed tool according to its intended workflow. Work only in this
> assigned run directory; do not inspect other benchmark runs, evaluator or
> fixture code, historical outcomes, or product source. Do not modify shared
> benchmark infrastructure. Leave an English run record with commands, first
> useful signal, reruns, files changed, generated artifacts, and one executable
> documented public invocation.

## T1 — Atomic transfer

Implement a callable application operation to transfer integer cents between
accounts. The supplied table is exactly `accounts(account_id BIGINT PRIMARY
KEY, balance_cents BIGINT NOT NULL CHECK (balance_cents >= 0))`; the runner
owns `transfer_audit(from_account_id BIGINT, to_account_id BIGINT,
amount_cents BIGINT, note TEXT)`. Do not create, migrate, seed, or replace
these tables. `DATABASE_URL` and a safe `BENCHMARK_SCHEMA` are supplied at
invocation. Use the nonce schema via validated qualification or connection
`search_path`, never a hard-coded `public` schema. Bind runtime values.

Accept source account ID, destination account ID, and positive integer cents.
Debit and credit must be one PostgreSQL transaction. Insufficient funds and a
failure after debit must leave no partial state; a successful transfer must
leave correct balances.

## T2 — Concurrent claim

Implement a callable PostgreSQL operation which claims one queued item for a
worker. The runner supplies `DATABASE_URL`, a safe `BENCHMARK_SCHEMA`, and
exactly `work_items(id BIGINT PRIMARY KEY, state TEXT CHECK (state IN
('queued','claimed')), claimed_by TEXT NULL)`. Use the nonce schema via
validated qualification or transaction-local `search_path`; never use fixed
`public`, migrations, seeds, or replacement DDL. Two simultaneous calls must
claim distinct queued items; a failure after marking a claim must roll it back;
bind runtime values.

## W5 — Deep-pagination investigation

A production-like PostgreSQL endpoint is slow when a client requests a deep
page. Diagnose actual `EXPLAIN`/`EXPLAIN ANALYZE` behavior, then improve it
while preserving the endpoint's pagination result and public callable boundary.
Keep the runner boundary callable. Do not replace the arm with another database
library or a hand-written substitute. The test environment supplies
`DATABASE_URL` and `BENCHMARK_SCHEMA`.
