# Phase 2 Verification

## Passed repository checks

| Check | Result |
| --- | --- |
| `pnpm typecheck` | passed |
| `pnpm test` | passed; PostgreSQL live test skipped in ordinary suite without a URL |
| `pnpm build` | passed |
| Support Inbox typecheck | passed |
| Support Inbox unit/route tests | passed: 17 passed, 25 environment-skipped before live setup |
| PostgreSQL preparation tests | passed: 3 passed |
| core safe-sort tests | passed: 2 passed |
| explicit Transfer typecheck | passed |
| `git diff --check` | passed before evidence commit |

Preparation tests prove missing/unused rejection, repeated binding identity, stale
metadata rejection, hostile-value separation, and optional-condition compression
before native execution.

## Live proof status

An isolated PostgreSQL 16 container was started through the existing Support
Inbox Compose file on port 55433. The following checks passed against that
container:

| Check | Result |
| --- | --- |
| `pnpm verify:postgres-live` | passed: native pg preparation live test (1) and CLI SQL-resource live tests (2) |
| Support Inbox `pnpm verify` | passed: 42 tests, including DB-backed route/integration proof |
| Ticket Queue reference `pnpm verify` | passed: 4 live tests, 4 contracts, 3 negative controls |

The Ticket Queue dedicated Compose service could not allocate a Docker network
because the host's predefined address pools were exhausted. Its verification was
therefore run against the already isolated Support Inbox PostgreSQL instance;
the reference owns separate `tickets` and `ticket_events` tables. This is an
environment capacity limitation, not a product failure.

## Cleanup

The Support Inbox verification container and its volume are removed after the
final repository verification. No pre-existing Docker container is changed.
