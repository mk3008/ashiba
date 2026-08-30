# Fixture runner reproduction

Run these commands from this `fixtures` directory with the frozen Node release
recorded in the benchmark preregistration (Node 24.18.0). Install this fixture's
committed `pg` dependency first; it is deliberately independent of the Ashiba
workspace dependency graph.

```powershell
npm ci
```

## Syntax and static controls

```powershell
node --check api-contract.mjs
node --check fixture.mjs
node --check runner.mjs
node --check reference/reference-application.mjs
node runner.mjs --negative-controls
node runner.mjs --reference-control --static-only
```

The last command hashes and scans the reference-control source only; it does
not open a database connection or execute a candidate.

## Live reference control

Set `DATABASE_URL` to a disposable PostgreSQL 18.6 database where the runner
role may create and drop a nonce `ashiba_v3_<16 lower-case hex>` schema. The
runner creates DDL and seed data itself, enables private trigger injection for
rollback checks, records a JSON result, and drops that nonce schema in `finally`.

```powershell
$env:DATABASE_URL = 'postgres://runner:password@127.0.0.1:5432/ashiba_benchmark'
node runner.mjs --reference-control --output .\evidence\reference-control.json
```

## Candidate entrypoint

After the candidate has independently built its TypeScript boundary, pass its
built ESM module that exports `createApplication(runtime)`. The runner does not
transpile TypeScript, modify candidate source, inject failure flags, or use
candidate tests/SQL/stdout as an oracle.

```powershell
node runner.mjs --candidate C:\candidate\dist\application.js --workload G1,T1,T2,Q1 --output C:\evidence\run.json
```

Do not use the static control or reference-control result as a scored cell. A
live run requires the PostgreSQL prerequisite above; no candidate run is valid
until the preregistration's packet, isolation, evidence, repair, and treatment
requirements are also satisfied.
