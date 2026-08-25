# PostgreSQL ticket queue reference

This is a small, standalone PostgreSQL application boundary. It uses four visible
canonical SQL files and a caller-owned `pg` pool; it does not use a repository,
mapper, unit of work, runtime SQL file loading, or a runtime SQL lexer.

## Run it

```sh
pnpm --filter postgres-ticket-queue-reference db:up
DATABASE_URL=postgres://ticket_queue:ticket_queue@localhost:55435/ticket_queue \
  pnpm --filter postgres-ticket-queue-reference verify
```

`verify` regenerates the small binding artifact, checks it is committed, derives
and checks PostgreSQL contracts, runs negative controls, and runs the live
integration tests.

## Execution path

The build-time generator reads the canonical `.sql` files and produces one
checked-in TypeScript module containing canonical SQL, a source hash, PostgreSQL
`$n` SQL, and ordered parameter names. At runtime the application calls
`preparePostgresQuery`, then gives the resulting SQL and separate values directly
to `pg`:

```ts
const prepared = preparePostgresQuery(query, params, { strictParameterNames: true });
const result = await pool.query(prepared.sql, [...prepared.values]);
```

`pg` owns pool acquisition and the assignment/audit transaction. The application
owns the small, static ordering allowlist; all application-supplied values remain
separate from SQL text. No value is interpolated, quoted, or escaped into SQL.

## Evidence included

- All list, get, assign, and audit SQL has a real PostgreSQL-derived contract.
- Contracts compare named parameter and result TypeScript types with the default
  node-postgres representation (`bigint` results are `string`, not `number`).
- The contract gate rejects stale SQL plus false `bigint → number` result and
  parameter declarations.
- Live tests exercise omitted/null/value assignee states, optional filters,
  bounded static sorting with a stable `id` tie-breaker, pagination, and rollback
  when the audit insert fails.
