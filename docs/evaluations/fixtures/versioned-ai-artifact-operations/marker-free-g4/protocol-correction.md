# Protocol correction and decision log

## Observed problem

The original O1 fixture used comments such as `/* @sort:search */` in canonical
SQL. Its G4 exercise therefore found a known marker rather than deriving and
validating a placement fact for ordinary complete SQL.

## Original assumption

The original report treated that marker-assisted result as G4 evidence for the
candidate artifact contract.

## Why it matters

Canonical SQL must remain independently reviewable, executable in a SQL
client, and usable when it comes from existing or external sources. Requiring a
project-specific marker weakens that boundary and changes the operational
question being evaluated.

## Protocol correction

This holdout uses a complete marker-free query and ordinary application code
for the reviewed ordering policy. The placement artifact contains only source
identity, an index, expected text, and immediate context. The verifier compares
those stored facts only; it does not parse SQL, discover `ORDER BY`, infer a
tie breaker, or recreate a coordinate. Runtime accepts only a bounded ordered
sequence of key/direction selections, composes application-owned expressions,
splices mechanically, lowers named parameters deterministically, and executes
native PostgreSQL.

## Previous evidence validity

The prior marker-assisted result remains valid as **historical calibration**:
it demonstrated per-query artifact operation, stale/orphan rejection,
Fresh-Agent repair, clean-clone operation, and the limitations of build-time
AI. It is not used as final evidence for marker-free G4 placement. This holdout
is the sole final G4 evidence for the corrected protocol.
