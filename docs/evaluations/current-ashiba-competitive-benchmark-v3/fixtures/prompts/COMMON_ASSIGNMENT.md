# Common scored assignment

Build the supplied strict TypeScript/PostgreSQL data-access candidate. Implement
only the workload-specific `createApplication(runtime)` operations listed in
the accompanying workload prompt, in `src/application.ts`, and satisfy the
supplied DDL, behaviour contract, and candidate tests. Use the installed arm's
normal data-access workflow for the main path. Keep all external values
parameterized; only a reviewed finite source-controlled mapping may select SQL
syntax. Do not change the DDL, runner, public API, environment variables, or
test/oracle files. Do not read this benchmark repository, another candidate,
or any historical evaluation. Run the prescribed typecheck, candidate tests,
and build before returning.
