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
node runner.mjs --negative-controls --static-only
node runner.mjs --reference-control --static-only
```

The last command hashes and scans the reference-control source only; it does
not open a database connection or execute a candidate.

## Live reference control

Set `DATABASE_URL` to a disposable PostgreSQL 18.6 database where the runner
role may create and drop a nonce `ashiba_v3_<16 lower-case hex>` schema and
short-lived login roles. The runner creates DDL and seed data itself, provisions
a unique non-superuser candidate role with only nonce-schema workload
privileges, enables private trigger injection for rollback checks, records a
JSON result without the candidate credential, and drops that role and schema
in `finally`.

```powershell
$env:DATABASE_URL = 'postgres://runner:password@127.0.0.1:5432/ashiba_benchmark'
node runner.mjs --reference-control --output .\evidence\reference-control.json
node runner.mjs --negative-controls
```

## Candidate entrypoint

After the candidate has independently built its TypeScript boundary, pass its
built ESM module that exports `createApplication(runtime)`. The runner does not
transpile TypeScript, modify candidate source, inject failure flags, or use
candidate tests/SQL/stdout as an oracle.

```powershell
node runner.mjs --candidate C:\candidate\dist\application.js --source-root C:\candidate --workload G1,T1,T2,Q1 --output C:\evidence\run.json
```

`--source-root` is the candidate package root, not its `src` directory. The
runner first finds the nearest `package.json` ancestor of the built entrypoint
and scans that complete package root. It hashes and scans source, tests,
configuration, package manifests, lockfiles, and generated textual state;
it excludes `node_modules`, `.git`, `.pnpm`, and binary files. Any symlink or
workspace/file/link dependency reference is a static failure, except the Arm A
reference that resolves to the supplied, hash-verified frozen tarball. Before
candidate import and throughout candidate API use, the runner removes the
administrator `DATABASE_URL` from the Node process environment; candidates
receive only the supplied least-privilege runtime connection string.

For a live run, the runner fsyncs `<output>.pre-cleanup.json` with the
runner-owned final database state before it drops the nonce fixture. The final
record remains at the requested `<output>` path and reports cleanup failure as
a failed result.

Do not use the static control or reference-control result as a scored cell. A
live run requires the PostgreSQL prerequisite above; no candidate run is valid
until the preregistration's packet, isolation, evidence, repair, and treatment
requirements are also satisfied.

## Isolation boundary

The runner enforces database isolation through a per-cell nonce schema and
short-lived least-privilege candidate role. It does **not** provide an operating
system sandbox: a candidate process on the same host can only be treated as
isolated if the execution environment separately restricts filesystem and
process access. The benchmark must report that limitation rather than claiming
the database role alone provides full clean-room isolation.
