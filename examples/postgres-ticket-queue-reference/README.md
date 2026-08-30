# PostgreSQL ticket queue reference

This is a small, standalone PostgreSQL application boundary. It uses four visible
canonical SQL files and a caller-owned `pg` pool; it does not use a repository,
mapper, unit of work, or a runtime SQL lexer. The application compiles the
visible SQL once at module initialization and caches the bindings.

## Run it

```sh
pnpm --filter postgres-ticket-queue-reference db:up
DATABASE_URL=postgres://ticket_queue:ticket_queue@localhost:55435/ticket_queue \
  pnpm --filter postgres-ticket-queue-reference verify
```

`verify` typechecks the application, runs its binding safety tests, and runs the
live integration tests when `DATABASE_URL` is provided.

## Execution path

The application reads each canonical `.sql` file at module initialization and
calls `compileNamedParameters` once to cache PostgreSQL `$n` SQL and ordered
parameter names. At request time it binds those names to values, then gives the
result directly to `pg`:

```ts
const prepared = bindNamedParameters(query, params);
const result = await pool.query(prepared.sql, [...prepared.values]);
```

`pg` owns pool acquisition and the assignment/audit transaction. The application
owns the small, static ordering allowlist; all application-supplied values remain
separate from SQL text. No value is interpolated, quoted, or escaped into SQL.
The SQL files and this small cache are application-owned; there is no committed
generated binding artifact or freshness lifecycle.

## Evidence included

- The application directly compiles all list, get, assign, and audit SQL at
  startup; the named-parameter package rejects stale call-site names.
- Live tests exercise omitted/null/value assignee states, optional filters,
  bounded static sorting with a stable `id` tie-breaker, pagination, and rollback
  when the audit insert fails.
