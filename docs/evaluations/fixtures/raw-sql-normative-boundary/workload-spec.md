# Frozen workload specification

Each candidate exports `queries` from `submission.mjs`. A query record has `{ sql, params, execute(client, input) }`; `sql` is the canonical named-parameter SQL. The evaluator imports the module, owns schema/data, invokes each record, and checks source and final behavior. Candidates may add small local modules, but must not modify evaluator or reference files.

## Fixture

The evaluator creates a nonce schema containing `items(id, title, status, priority, owner, note)` and four deterministic rows. The candidate must not refer to `public` or infer the schema name.

## W1 — optional filters

Implement `search({ status, owner, needle })`. Every combination of `null` and a present value is evaluated. `needle` includes a hostile string. The SQL must express optional semantics itself, retain named parameters, return the expected rows, and avoid constructed SQL.

## W2 — finite runtime ordering

Implement `list({ sort, direction })`. `sort` is `title | priority`, and direction is `asc | desc`. A hostile sort string must be rejected before execution; it must not appear in emitted SQL. The implementation may choose a reviewed map, a switch, or separate complete SQL assets.

## W3 — similar but distinct queries

Implement `openItems()` and `ownedItems({ owner })`. They are intentionally related but have different purposes. Their source assets must remain individually identifiable; no generic query builder is required or rewarded.

## W4 — named execution boundary

Implement `bindingEdgeCases({ note, status })` using a canonical statement that contains repeated parameters, `::` casts, a string literal containing `:not_a_parameter`, and a comment containing `:not_a_parameter`. The positional SQL actually sent to PostgreSQL and its ordered values must be correct. The evaluator rejects runtime SQL construction other than a finite reviewed selection for W2.
