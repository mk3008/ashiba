# Evaluation-only harness instructions

This file is not consumer guidance. Work only in the clean room supplied by the
runner. Do not inspect the Ashiba repository, existing examples, evaluations,
other candidates, or previous outputs. Use only the packed named-parameter
package in `tarballs/`, normal npm dependencies, and the frozen files in
`input/`.

Create a runnable Vertical Slice TypeScript application. Application and query
source must be `.ts`, tests should be `.ts`, and `tsconfig.json` must use
`strict: true`. Do not use `allowJs: true` with `checkJs: false`, nor implement
the application only in `.mjs`.

Install the supplied package tarball with npm. Keep SQL and query integration
feature-local. Use named-parameter primitives and execute the returned
`{ sql, values }` with native `pg`. Do not add any other Ashiba package or an
Ashiba-specific runtime abstraction.

Implement the full frozen acceptance. Provide scripts for strict typechecking,
building, and tests. Expose
`createTicketApplication(connectionString)` from
`src/tickets/application/tickets.ts`; it must return `list`, `get`, `assign`,
and `dispose` methods compatible with the supplied acceptance. The runner owns
final verification and PostgreSQL behavior checks.

Return the output path, commands run and their results, a short file summary,
and unresolved issues.
