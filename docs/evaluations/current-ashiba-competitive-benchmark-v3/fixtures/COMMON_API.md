# Frozen common candidate API and behaviour

The runner imports `createApplication(runtime)` from `src/application.ts`.
`runtime` contains a PostgreSQL connection string, a safe evaluator-chosen
schema name, and an audit-failure injection flag. Candidates may wrap it in
their own infrastructure but may not require the runner to construct queries,
transactions, or tool-specific artefacts.

The returned object must expose:

- `list(input)` — optional status/assignee filters, reviewed finite sort,
  stable `id` tie-breaker, and offset pagination;
- `get(input)` — a ticket lookup;
- `create(input)` and `assign(input)` — ticket mutation; assign writes an
  audit record in the same transaction and rolls back on injected failure;
- `transfer(input)` — debit, credit, and audit atomically; insufficient funds
  and an injected post-debit failure leave no partial state;
- `claim(input)` — concurrent workers cannot claim the same queued work item;
- `investigate(input)` — execute the supplied complex PostgreSQL query and
  return enough source/executed-SQL information for the runner to request an
  `EXPLAIN`.

The runner owns DDL, seed data, nonce schema lifecycle, behavioural assertions,
and cleanup. It uses parameterized assertions and never imports candidate
queries, generated types, or candidate tests.

