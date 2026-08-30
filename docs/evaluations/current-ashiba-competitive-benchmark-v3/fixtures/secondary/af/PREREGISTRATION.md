# AF-V / AF-L frozen run packet

Protocol: `secondary-controls-v1`, architecture harness version
`af-controls-v1`.

## Cells and treatment

The preregistered AF matrix is:

```text
AF-V, AF-L
× A (Ashiba), P (Prisma 8 RC), S (sqlc TypeScript),
  D (Drizzle), K (Kysely), G (plain pg)
× r1, r2
```

The primary G1 arm package locks, arm prompts, common API, schema, seed and
behavior prompt are read-only inputs. The runner-facing API is unchanged.
Every candidate starts with an architecture-specific application skeleton,
then receives exactly the G1 assignment plus its primary arm assignment and
one short architecture clause. The candidate may add treatment-normal files;
it must not redesign the frozen skeleton merely to satisfy a tool.

## Measurement and pass condition

The runner records an observation, not a numeric architecture score:

* hashes of all runner-owned baseline files and candidate files;
* changed, missing, moved, or renamed baseline skeleton files;
* new source files, global/config files, and generated directories;
* pool, transaction, DTO, and test seam changes;
* whether SQL remains feature-local under the frozen architecture; and
* treatment-associated mechanical guarantees.

There is no arbitrary file-count threshold. A cell passes only when the
trusted baseline is intact, the primary G1 PostgreSQL oracle passes, primary
static no-workspace checks pass, and the architecture delta is complete.
The normal primary repair cap applies: initial attempt plus two candidate
repairs. Environment and harness incidents are recorded separately.

## Non-interference and preservation

Each attempt uses a new external directory, isolated npm cache, evidence
directory, candidate source root and primary-runner nonce schema/role. Primary
packet/runner/evidence stay read-only. Candidate source snapshots and every
attempt result, including failures, must be preserved before cleanup. The
trusted manifests in `baselines/*/BASELINE_MANIFEST.json` are never copied as
editable candidate inputs.

Changing this packet after the first scored AF cell requires the secondary
correction policy: preserve original evidence, commit a correction and rerun
all affected AF cells. H-003 is the first such correction: AF-V r1 initial
materializations are preserved as pre-correction evidence and must be rerun
from a newly materialized, isolated corrected baseline before interpretation.
