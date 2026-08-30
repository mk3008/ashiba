# Ticket application invariants

- Treat the supplied DDL as the database contract.
- Keep canonical SQL visible in feature-local `.sql` files.
- Use meaningful named parameters for application values; regenerate and check
  binding metadata after SQL changes.
- Call `bindNamedParameters` and pass its `sql` and `values` directly to native
  `pg`.
- In nullable PostgreSQL guards, make the parameter type explicit when the
  `NULL` use would otherwise be ambiguous, for example
  `cast(:status as text) is null`.
- Pools, transactions, rollback, logging, result mapping, and business sort
  policy are application-owned.
- A dynamic SQL ordering term may come only from a closed, reviewed,
  source-controlled finite map. Never interpolate raw external input into SQL.
- Prove behavior with tests; missing and unused bindings must still fail before
  the database call.
- Discover CLI commands instead of guessing them with
  `ashiba describe command --format json` when needed.
