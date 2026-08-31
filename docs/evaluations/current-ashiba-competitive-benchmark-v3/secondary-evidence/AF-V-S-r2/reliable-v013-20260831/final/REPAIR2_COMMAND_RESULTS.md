# Repair 2 command results

The following candidate-local commands produced no stdout/stderr and exited zero.
Their source/output state is preserved in the matching final candidate snapshot
and the runner's source manifest.

| Command | Result |
| --- | --- |
| `sqlc.exe generate` using the verified 1.31.1 binary and 0.1.3 plugin | exit 0; regenerated `src/tickets/generated/queries_sql.ts` |
| `node node_modules/typescript/bin/tsc --noEmit` | exit 0 |
| `node node_modules/typescript/bin/tsc` | exit 0; emitted `dist/` used by the runner |
| final `tsc --noEmit --project tsconfig.json` reconfirmation | exit 0 |

`candidate-tests.json` separately records that the frozen S package has no
candidate test script. The AF runner then failed before database setup at its
static inspection; see `runner.json` and `primary-g1.json`.
