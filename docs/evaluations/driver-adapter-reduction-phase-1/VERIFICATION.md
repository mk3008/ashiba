# Verification

## Repository checks

| Command | Result |
| --- | --- |
| `pnpm typecheck` | passed; 7 of 10 colocated workspace packages selected |
| `pnpm build` | passed |
| `pnpm test` | passed before the final native-style binding additions; named parameters then rerun as 8 passed, core 13, PG adapter 65 (3 skipped), CLI 24 (2 skipped), Support Inbox 17 (25 skipped), Ticket Queue 1 (1 skipped) |
| `pnpm verify:publish-order` | passed; 5 public packages and 3 internal dependency edges |
| `pnpm docs:build` | passed |
| `pnpm verify:consumer-install` | passed; packed CLI/named-parameter consumer smoke generated PostgreSQL, mysql2, and mssql binding metadata |
| `pnpm verify:customer-tutorial:docker` | passed; Golden Path tutorial smoke generated all three dialect binding forms |
| `pnpm verify:customer-functional` | passed |
| `git diff --check` | passed |

`pnpm verify` completed successfully as the final standard verification run;
the individually observed constituent commands above also completed
successfully.

## Supplemental live checks

`ASHIBA_TEST_DATABASE_URL` and `ASHIBA_POSTGRES_DATABASE_URL` were absent, so
`pnpm verify:postgres-live` stopped at its explicit environment guard and
reference application PostgreSQL live checks were not run. This phase removes
only unused MySQL/MSSQL wrappers and a retry helper; it does not change
native-driver behavior, the PostgreSQL adapter, the standalone PostgreSQL
contract, or DBMS support. The skipped live evidence is nevertheless a stated
limitation rather than a pass.

Consumer-install temporary directories created during this phase were
explicitly removed after each verification run. No database or container was
created by this phase.
