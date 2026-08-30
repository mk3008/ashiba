# Preregistration amendment 2: current-generation Prisma correction

## User-directed correction before scoring

At this correction point, the scored-cell count is **zero**. No Fresh-Agent
candidate, calibration candidate, or live candidate execution has started.
This amendment preserves the initial preregistration and amendment 1 rather
than rewriting either record.

The research target is current, AI-era PostgreSQL/TypeScript workflows.
Accordingly, the scored Prisma arm is changed from the stable Prisma 7.10.0
predecessor to the latest officially published **Prisma 8 Release Candidate**
at execution-packet freeze. Prisma 7 remains historical context only and is
not a scored arm.

## Frozen consequences

- Arm `P` is named **Prisma 8 RC / current-generation Prisma workflow**.
- Prisma 8 must never be described in this benchmark as GA or stable.
- The exact `8.0.0-rc.x` version, published package integrity, official
  documentation snapshots, CLI/configuration, contract/schema authoring,
  generated contract/types, runtime query API, PostgreSQL integration, and
  official agent guidance/Skills are fixed in the later execution-packet
  freeze commit.
- Prisma 8 RC release status is reported as product maturity/context, not a
  score penalty.
- The primary matrix remains **6 arms × 4 workloads × 2 replicates = 48
  scored cells**. No result exists that could have influenced this change.
- Any Prisma raw-SQL escape hatch must remain in the official Prisma 8 path;
  its amount, reason, and treatment-fidelity consequence are retained.

## Interpretation boundary

The P arm measures the frozen Prisma 8 RC/current-generation workflow, not
all past or future Prisma releases. A result for this arm is not a claim about
Prisma 7, nor a claim that RC maturity is equivalent to a GA release.

