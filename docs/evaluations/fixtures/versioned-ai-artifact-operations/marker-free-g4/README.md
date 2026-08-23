# Marker-free G4 holdout

This corrective holdout evaluates a placement coordinate without placing an
Ashiba marker, directive, or DSL in canonical SQL. `queries/list.sql` is a
complete ordinary SQL statement suitable for a SQL client. The application owns
the ordering policy in `application/list-ordering.mjs`; the derived artifact
contains only source identity and local insertion context.

The verifier deliberately does not parse SQL or infer an `ORDER BY` clause. It
checks only registered artifact paths, source hash, index bounds, exact expected
text, and locally stored before/after context. Runtime selects bounded keys and
directions from the application policy, splices them mechanically, then uses
deterministic named-parameter lowering.

Run `node scripts/test.mjs` and `node scripts/postgres-live.mjs`.
