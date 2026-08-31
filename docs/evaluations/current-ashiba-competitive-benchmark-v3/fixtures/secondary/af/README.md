# AF-V / AF-L architecture-fitness control

This directory contains the runner-owned materializer, frozen baseline
skeletons, and oracle for the two architecture-fitness controls in Current
Ashiba Competitive Benchmark v3.

`AF-V` starts each candidate from a vertical-slice skeleton. `AF-L` starts
from an ordinary layered skeleton. Both controls ask the candidate to add the
same G1 data-access feature while retaining the supplied `pg` pool,
transaction, DTO, and test seams. The result is **not** a productivity score:
it records what a treatment required the application to move, centralize,
configure, generate, or replace.

The control is deliberately separate from the primary packet. The primary
runner is imported read-only only to execute its existing G1 PostgreSQL oracle.
No file in the primary packet, primary runner, primary candidate directories,
or primary evidence is written by this control.

## Frozen candidate API

Candidates implement the primary frozen `createApplication(runtime)` G1 API:
`list`, `get`, `create`, `assign`, and idempotent `close`. The canonical API,
DDL, seed, arm treatment, and G1 behavior are copied from the read-only
primary packet into each clean room. See `RUNNER_API.md` for the additional
architecture observation record.

## Materialization

```text
node materialize-af-cell.mjs \
  --cell AF-V-A-r1 \
  --destination /absolute/external/AF-V-A-r1 \
  --npm /path/to/npm [--cache /isolated/npm-cache] [--install]
```

Cells are `AF-V|AF-L` × `A|P|S|D|K|G` × `r1|r2`. The destination must be
outside the repository. It receives a private candidate directory, packet,
evidence directory, artifacts directory where needed, and npm cache. The
candidate sees only its own copied packet and baseline; the trusted baseline
manifest remains runner-owned in this directory.

## Runner

```text
DATABASE_URL=postgres://runner:runner@127.0.0.1:55433/ashiba_benchmark \
node runner.mjs \
  --control AF-V \
  --arm A \
  --replicate 1 \
  --candidate /absolute/external/AF-V-A-r1/candidate/dist/application.js \
  --source-root /absolute/external/AF-V-A-r1/candidate \
  --output /absolute/external/AF-V-A-r1/evidence/runner.json
```

The runner writes a complete result and an adjacent pre-cleanup record. The
primary runner owns the nonce schema/least-privilege role and records its
runner-owned final database state before cleanup. The architecture runner then
adds a trusted baseline/candidate hash delta and treatment-neutral guarantees
observation.

No candidate was executed when this AF harness was authored.
