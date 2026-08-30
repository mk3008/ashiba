# VSA TypeScript clean-room rerun

This rerun corrects the original VSA release evidence. The earlier reference
used `.mjs` application code with `allowJs: true` and `checkJs: false`; it was
not proof that a TypeScript application had been generated or typechecked.

## Input provenance

The fresh Luna worker received a newly created clean room containing only:

- packed `@ashiba-ts/cli` and `@ashiba-ts/named-parameters` tarballs;
- normal npm dependencies;
- frozen `schema.sql` and business acceptance;
- a consumer `AGENTS.md`;
- the concise consumer prompt committed as
  `examples/postgres-ticket-queue-vsa/ORIGINAL_PROMPT.md`;
- separate evaluation-only harness instructions.

It was prohibited from reading the Ashiba repository, existing references,
evaluations, prior clean rooms, or previous candidates. The repository copy
changes tarball dependency entries to `workspace:*` only for repository CI.

## Exact concise consumer prompt

> Build a TypeScript PostgreSQL ticket application using Vertical Slice
> Architecture.
>
> Use Ashiba according to `AGENTS.md` and the existing DDL/business acceptance.
> Keep SQL and generated binding metadata inside the ticket slice. Use native
> `pg`.
>
> Do not add an ORM, migration framework, generic query builder, or Ashiba
> runtime abstraction.

## TypeScript evidence

The candidate uses `.ts` application/query source, `.ts` generated binding
artifacts, TypeScript tests, and a strict `tsconfig.json`. Its only `.mjs` file
is the Node-native metadata-generation script. It does not enable `allowJs` or
`checkJs: false`.

The runner independently passed:

```text
npm run generate
npm run check:generated
npm run typecheck
npm test
```

The result was eight fresh binding artifacts, strict `tsc --noEmit`, and three
candidate tests passing.

## Runner-owned PostgreSQL oracle

Against a disposable PostgreSQL 16 container, the runner compiled the adopted
reference and passed `node scripts/verify-vsa-reference-oracle.mjs
examples/postgres-ticket-queue-vsa`. The oracle, not candidate tests, checked:

- optional status and assignee filters;
- all four finite reviewed sort pairs and stable `id` ties;
- pagination and get;
- hostile SQL-looking status binding without SQL alteration;
- named binding missing and unused rejection;
- native `pg` assign-plus-audit transaction commit; and
- database-triggered audit insertion failure with assignment rollback.

The container `ashiba-vsa-evidence-oracle` was removed after the pass.

## Repairs and limitations

The rerun required no bounded repair, retry, or escalation. The prior VSA
repair history remains historical evidence only and is not used as the
TypeScript release proof. Token and credit telemetry were unavailable.
