# Evaluation-only harness instructions for Arm C

This file is not consumer guidance. Work only in the clean room supplied by the
runner. Do not inspect the Ashiba repository, existing examples, evaluations,
other candidates, or previous outputs. Use only the packed named-parameter
package in `tarballs/`, normal npm dependencies, and the frozen files in
`input/`.

Create a runnable Vertical Slice TypeScript application. Application and query
source must be `.ts`, tests should be `.ts`, and `tsconfig.json` must use
`strict: true`. Do not use `allowJs: true` with `checkJs: false`, nor implement
the application only in `.mjs`.

Install only the supplied `@ashiba-ts/named-parameters` tarball as Ashiba
software. Do not use `@ashiba-ts/cli`, `model-gen`, a generated or committed
static binding module, `sourceHash`, or a freshness command/lifecycle. Keep
canonical SQL in visible `.sql` files. Use `compileNamedParameters()` directly
in controlled application startup/initialization and cache the compiled results
for execution; do not compile separately for each query execution. Use
`bindNamedParameters()` and execute its returned `{ sql, values }` with native
`pg`.

Keep SQL and query integration feature-local. Implement the full frozen
acceptance. Expose `createTicketApplication(connectionString)` from
`src/tickets/application/tickets.ts`; it must return `list`, `get`, `assign`,
and `dispose` methods compatible with the supplied acceptance. The runner owns
final verification and PostgreSQL behavior checks.

Return the output path, commands run and their results, a short file summary,
where controlled compilation is cached, and unresolved issues.
