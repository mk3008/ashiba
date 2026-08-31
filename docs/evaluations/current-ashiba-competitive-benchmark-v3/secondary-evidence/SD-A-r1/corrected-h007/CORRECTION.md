# H-007 corrected SD-A-r1 evidence

This directory is replacement evidence for the preserved original
`secondary-evidence/SD-A-r1/final/` result. The original static-isolation
failure is not overwritten.

## Reproduction

- Source snapshot: `candidate-snapshots/G1-A-r1`.
- Fresh external run directory: `C:\tmp\ashiba-benchmark-v3-secondary\SD-A-r1-corrected-h007-20260831`.
- Node: `v24.18.0`; npm: `11.16.0`.
- PostgreSQL: `postgres:18.6` on the frozen local benchmark port `55433`.
- Supplied artifact: `fixtures/artifacts/ashiba-ts-named-parameters-0.1.0.tgz`, SHA-256
  `64b95657af62120d5b8662224b298cc610a74280e515b33ee485e41247bdcc4d`.
- Materialization used `fixtures/secondary/sd/materialize-sd-cell.mjs` with
  `--cell SD-A-r1` and the frozen G1-A-r1 snapshot.
- The artifact was copied to the run directory's sibling `artifacts/` path,
  followed by `npm ci --ignore-scripts --cache <cell-local-cache>` in the
  candidate and `npm run build`.
- The frozen SD runner was invoked with `--arm A`, the built
  `dist/application.js`, the candidate source root, the isolated database URL,
  `--typecheck-command "npm run typecheck"`, and `--test-command "npm test"`.

## Integrity and result

- Historical source-manifest hash: `f6bacdfc2f67ea0606488e2c657d1f294d5ce0890106d34bca8ab02280343506`.
- Corrected materialization hash: `f6bacdfc2f67ea0606488e2c657d1f294d5ce0890106d34bca8ab02280343506`.
- Source remained unchanged before and after every mutation.
- Corrected static isolation: `pass`, with no findings. The H-007 exception
  permits only the exact frozen packed artifact reference; other workspace
  references remain rejected.
- Corrected SD status: `P`.
- `column-rename`: typecheck pass, candidate tests pass, application execution
  failed before the renamed `title` column could be read (`42703`).
- `nullability-tighten`: typecheck pass, candidate tests pass, application
  execution not detected in the measured stages.
- `integer-to-bigint`: typecheck pass, candidate tests pass, application
  execution not detected in the measured stages.
- Every mutation cleaned its isolated schema, role, and connection: `pass`.

The complete runner-owned record is [sd.json](sd.json); the materialization
manifest and copied packet are retained beside it.

After the durable copies were verified, the temporary candidate directory and
its cell-local npm cache were removed. The PostgreSQL schemas, roles, and
connections had already reported `pass` cleanup for every mutation.
