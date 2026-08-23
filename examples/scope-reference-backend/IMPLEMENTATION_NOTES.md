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
